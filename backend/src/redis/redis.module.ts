import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';
import { DistributedLockService } from './distributed-lock.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisService, DistributedLockService],
  exports: [RedisService, DistributedLockService],
})
export class RedisModule {}
