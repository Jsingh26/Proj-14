import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { JobsService } from './jobs.service';
import { JobStatus } from './dto/update-job-status.dto';

describe('Real Concurrency Integration Test (PostgreSQL + Redis)', () => {
  let app: INestApplication;
  let jobsService: JobsService;
  let prisma: PrismaService;
  let redisService: RedisService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    jobsService = app.get<JobsService>(JobsService);
    prisma = app.get<PrismaService>(PrismaService);
    redisService = app.get<RedisService>(RedisService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should guarantee that two simultaneous PENDING -> RUNNING requests result in exactly ONE success and ONE 409 Conflict', async () => {
    // 1. Create a fresh test job
    const job = await jobsService.create({
      title: 'Concurrency Benchmark Job',
      type: 'test-concurrency',
    });

    expect(job.status).toBe(JobStatus.PENDING);

    // 2. Fire two simultaneous updateStatus calls
    const [resultA, resultB] = await Promise.allSettled([
      jobsService.updateStatus(job.id, JobStatus.RUNNING),
      jobsService.updateStatus(job.id, JobStatus.RUNNING),
    ]);

    const fulfilled = [resultA, resultB].filter((r) => r.status === 'fulfilled');
    const rejected = [resultA, resultB].filter((r) => r.status === 'rejected');

    // 3. Verify exactly 1 succeeded and 1 failed
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // 4. Verify the rejected error is a 409 Conflict
    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejectionReason.getStatus()).toBe(409);

    // 5. Verify database state is RUNNING
    const dbJob = await prisma.job.findUnique({ where: { id: job.id } });
    expect(dbJob?.status).toBe(JobStatus.RUNNING);

    // 6. Verify Redis lock was released
    const redis = redisService.getClient();
    const lockVal = await redis.get(`job:${job.id}:status-lock`);
    expect(lockVal).toBeNull();

    // Clean up
    await jobsService.remove(job.id);
  });
});
