import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { DistributedLockService } from '../redis/distributed-lock.service';
import { JobStatus } from './dto/update-job-status.dto';

describe('JobsService', () => {
  let service: JobsService;
  let prisma: PrismaService;
  let lockService: DistributedLockService;

  const mockPrisma = {
    job: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockLockService = {
    acquireLock: jest.fn(),
    releaseLock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DistributedLockService, useValue: mockLockService },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    prisma = module.get<PrismaService>(PrismaService);
    lockService = module.get<DistributedLockService>(DistributedLockService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a job with PENDING status and return it', async () => {
      const mockCreated = {
        id: 1,
        title: 'Generate Monthly Report',
        type: 'report',
        status: JobStatus.PENDING,
        createdAt: new Date(),
      };
      mockPrisma.job.create.mockResolvedValue(mockCreated);

      const result = await service.create({
        title: 'Generate Monthly Report',
        type: 'report',
      });

      expect(result).toEqual(mockCreated);
      expect(mockPrisma.job.create).toHaveBeenCalledWith({
        data: {
          title: 'Generate Monthly Report',
          type: 'report',
          status: JobStatus.PENDING,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return all jobs ordered by createdAt DESC', async () => {
      const mockJobs = [
        { id: 2, title: 'Job 2', type: 'email', status: JobStatus.RUNNING, createdAt: new Date() },
        { id: 1, title: 'Job 1', type: 'report', status: JobStatus.PENDING, createdAt: new Date() },
      ];
      mockPrisma.job.findMany.mockResolvedValue(mockJobs);

      const result = await service.findAll();
      expect(result).toEqual(mockJobs);
      expect(mockPrisma.job.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a single job if found', async () => {
      const mockJob = { id: 1, title: 'Job 1', type: 'report', status: JobStatus.PENDING, createdAt: new Date() };
      mockPrisma.job.findUnique.mockResolvedValue(mockJob);

      const result = await service.findOne(1);
      expect(result).toEqual(mockJob);
    });

    it('should throw NotFoundException if job does not exist', async () => {
      mockPrisma.job.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus - Valid Transitions', () => {
    beforeEach(() => {
      mockLockService.acquireLock.mockResolvedValue({ acquired: true, token: 'test-uuid-token' });
      mockLockService.releaseLock.mockResolvedValue(true);
    });

    it('should transition PENDING -> RUNNING successfully', async () => {
      const updatedJob = { id: 1, title: 'Job 1', type: 'report', status: JobStatus.RUNNING, createdAt: new Date() };
      mockPrisma.job.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.job.findUnique.mockResolvedValue(updatedJob);

      const result = await service.updateStatus(1, JobStatus.RUNNING);

      expect(mockLockService.acquireLock).toHaveBeenCalledWith('job:1:status-lock', 5000);
      expect(mockPrisma.job.updateMany).toHaveBeenCalledWith({
        where: { id: 1, status: { in: [JobStatus.PENDING] } },
        data: { status: JobStatus.RUNNING },
      });
      expect(mockLockService.releaseLock).toHaveBeenCalledWith('job:1:status-lock', 'test-uuid-token');
      expect(result.status).toBe(JobStatus.RUNNING);
    });

    it('should transition RUNNING -> COMPLETED successfully', async () => {
      const updatedJob = { id: 1, title: 'Job 1', type: 'report', status: JobStatus.COMPLETED, createdAt: new Date() };
      mockPrisma.job.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.job.findUnique.mockResolvedValue(updatedJob);

      const result = await service.updateStatus(1, JobStatus.COMPLETED);

      expect(mockPrisma.job.updateMany).toHaveBeenCalledWith({
        where: { id: 1, status: { in: [JobStatus.RUNNING] } },
        data: { status: JobStatus.COMPLETED },
      });
      expect(result.status).toBe(JobStatus.COMPLETED);
    });

    it('should transition RUNNING -> FAILED successfully', async () => {
      const updatedJob = { id: 1, title: 'Job 1', type: 'report', status: JobStatus.FAILED, createdAt: new Date() };
      mockPrisma.job.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.job.findUnique.mockResolvedValue(updatedJob);

      const result = await service.updateStatus(1, JobStatus.FAILED);

      expect(mockPrisma.job.updateMany).toHaveBeenCalledWith({
        where: { id: 1, status: { in: [JobStatus.RUNNING] } },
        data: { status: JobStatus.FAILED },
      });
      expect(result.status).toBe(JobStatus.FAILED);
    });
  });

  describe('updateStatus - Invalid Transitions & State Machine Invariants', () => {
    beforeEach(() => {
      mockLockService.acquireLock.mockResolvedValue({ acquired: true, token: 'test-uuid-token' });
      mockLockService.releaseLock.mockResolvedValue(true);
    });

    it('should reject transition to PENDING immediately (terminal backwards)', async () => {
      await expect(service.updateStatus(1, JobStatus.PENDING)).rejects.toThrow(ConflictException);
      expect(mockLockService.acquireLock).not.toHaveBeenCalled();
    });

    it('should reject PENDING -> COMPLETED (bypassing RUNNING)', async () => {
      // updateMany checks status in [RUNNING], so count is 0
      mockPrisma.job.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.job.findUnique.mockResolvedValue({ id: 1, status: JobStatus.PENDING });

      await expect(service.updateStatus(1, JobStatus.COMPLETED)).rejects.toThrow(ConflictException);
      expect(mockLockService.releaseLock).toHaveBeenCalled();
    });

    it('should reject COMPLETED -> RUNNING (cannot transition from terminal state)', async () => {
      mockPrisma.job.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.job.findUnique.mockResolvedValue({ id: 1, status: JobStatus.COMPLETED });

      await expect(service.updateStatus(1, JobStatus.RUNNING)).rejects.toThrow(ConflictException);
      expect(mockLockService.releaseLock).toHaveBeenCalled();
    });

    it('should reject FAILED -> RUNNING (cannot transition from terminal state)', async () => {
      mockPrisma.job.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.job.findUnique.mockResolvedValue({ id: 1, status: JobStatus.FAILED });

      await expect(service.updateStatus(1, JobStatus.RUNNING)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if job does not exist during update', async () => {
      mockPrisma.job.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.job.findUnique.mockResolvedValue(null);

      await expect(service.updateStatus(999, JobStatus.RUNNING)).rejects.toThrow(NotFoundException);
      expect(mockLockService.releaseLock).toHaveBeenCalled();
    });
  });

  describe('updateStatus - Concurrency and Distributed Lock', () => {
    it('should throw ConflictException if lock is already held by another request', async () => {
      mockLockService.acquireLock.mockResolvedValue({ acquired: false });

      await expect(service.updateStatus(1, JobStatus.RUNNING)).rejects.toThrow(ConflictException);
      expect(mockPrisma.job.updateMany).not.toHaveBeenCalled();
    });

    it('should throw ServiceUnavailableException if Redis fails when acquiring lock', async () => {
      mockLockService.acquireLock.mockRejectedValue(
        new ServiceUnavailableException('Distributed lock service is currently unavailable.'),
      );

      await expect(service.updateStatus(1, JobStatus.RUNNING)).rejects.toThrow(ServiceUnavailableException);
    });

    it('should handle two simultaneous requests by allowing exactly one to transition', async () => {
      // Simulate Request A and Request B
      // Request A acquires lock and completes update
      mockLockService.acquireLock
        .mockResolvedValueOnce({ acquired: true, token: 'token-A' })
        .mockResolvedValueOnce({ acquired: false }); // Request B fails to acquire lock

      mockPrisma.job.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.job.findUnique.mockResolvedValueOnce({ id: 1, status: JobStatus.RUNNING });

      const reqA = service.updateStatus(1, JobStatus.RUNNING);
      const reqB = service.updateStatus(1, JobStatus.RUNNING);

      const [resA, errB] = await Promise.allSettled([reqA, reqB]);

      expect(resA.status).toBe('fulfilled');
      expect(errB.status).toBe('rejected');
      if (errB.status === 'rejected') {
        expect(errB.reason).toBeInstanceOf(ConflictException);
      }
    });
  });

  describe('remove', () => {
    it('should delete existing job successfully', async () => {
      mockPrisma.job.delete.mockResolvedValue({ id: 1 });

      await expect(service.remove(1)).resolves.not.toThrow();
      expect(mockPrisma.job.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException if job does not exist', async () => {
      mockPrisma.job.delete.mockRejectedValue({ code: 'P2025' });

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
