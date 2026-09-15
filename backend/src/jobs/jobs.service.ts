import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DistributedLockService } from '../redis/distributed-lock.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobStatus } from './dto/update-job-status.dto';

/**
 * Maps each target status to the list of valid source statuses.
 * Enforces the state machine:
 *   PENDING -> RUNNING -> COMPLETED
 *                      -> FAILED
 */
export const VALID_PREVIOUS_STATUSES: Record<JobStatus, JobStatus[]> = {
  [JobStatus.PENDING]: [], // Terminal backwards: nothing can transition to PENDING
  [JobStatus.RUNNING]: [JobStatus.PENDING],
  [JobStatus.COMPLETED]: [JobStatus.RUNNING],
  [JobStatus.FAILED]: [JobStatus.RUNNING],
};

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly distributedLockService: DistributedLockService,
  ) {}

  /**
   * Create a new job. Initial status is always PENDING.
   */
  async create(dto: CreateJobDto) {
    this.logger.log(`Creating job: title="${dto.title}", type="${dto.type}"`);
    return this.prisma.job.create({
      data: {
        title: dto.title,
        type: dto.type,
        status: JobStatus.PENDING,
      },
    });
  }

  /**
   * Return all jobs ordered by createdAt DESC.
   */
  async findAll() {
    return this.prisma.job.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Find a single job by ID or throw 404.
   */
  async findOne(id: number) {
    const job = await this.prisma.job.findUnique({
      where: { id },
    });
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    return job;
  }

  /**
   * Update job status with distributed locking and atomic database-level conditional update.
   *
   * Defense-in-depth:
   * 1. State machine validation (fast rejection of statically invalid transitions)
   * 2. Redis distributed lock (job:{id}:status-lock) to prevent parallel mutation
   * 3. Database conditional UPDATE (WHERE id = $1 AND status IN (...))
   * 4. Safe Lua script lock release
   */
  async updateStatus(id: number, targetStatus: JobStatus) {
    const allowedPrevStatuses = VALID_PREVIOUS_STATUSES[targetStatus];

    // 1. Validate if target status can ever be transitioned to
    if (!allowedPrevStatuses || allowedPrevStatuses.length === 0) {
      throw new ConflictException(
        `Invalid job status transition: cannot transition to ${targetStatus}`,
      );
    }

    const lockKey = `job:${id}:status-lock`;
    const lockTtlMs = 5000;

    // 2. Acquire Redis distributed lock
    const { acquired, token } = await this.distributedLockService.acquireLock(
      lockKey,
      lockTtlMs,
    );

    if (!acquired || !token) {
      this.logger.warn(
        `Concurrency conflict: lock for job ${id} is already held by another request`,
      );
      throw new ConflictException(
        'Job status is currently being updated by another concurrent request. Please retry.',
      );
    }

    try {
      // 3. Perform database-level atomic conditional update
      const updateResult = await this.prisma.job.updateMany({
        where: {
          id,
          status: { in: allowedPrevStatuses },
        },
        data: {
          status: targetStatus,
        },
      });

      // If affectedRows === 1, transition succeeded atomically
      if (updateResult.count === 1) {
        this.logger.log(
          `Job ${id} transitioned successfully to ${targetStatus}`,
        );
        return await this.prisma.job.findUnique({
          where: { id },
        });
      }

      // If affectedRows === 0, either job does not exist or status changed
      const existingJob = await this.prisma.job.findUnique({
        where: { id },
      });

      if (!existingJob) {
        throw new NotFoundException(`Job with ID ${id} not found`);
      }

      this.logger.warn(
        `Invalid transition attempted for job ${id}: current status is "${existingJob.status}", requested "${targetStatus}"`,
      );
      throw new ConflictException(
        `Job status has already changed or the requested transition is invalid (current: ${existingJob.status}, requested: ${targetStatus})`,
      );
    } finally {
      // 4. Safely release the Redis lock using Lua script
      await this.distributedLockService.releaseLock(lockKey, token);
    }
  }

  /**
   * Delete a job by ID. Throws 404 if not found.
   */
  async remove(id: number): Promise<void> {
    try {
      await this.prisma.job.delete({
        where: { id },
      });
      this.logger.log(`Job ${id} deleted successfully`);
    } catch (error) {
      if (error?.code === 'P2025') {
        throw new NotFoundException(`Job with ID ${id} not found`);
      }
      throw error;
    }
  }
}
