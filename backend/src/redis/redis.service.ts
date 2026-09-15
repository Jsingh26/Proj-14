import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.logger.log(`Connecting to Redis at ${redisUrl}...`);

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        // Reconnect with exponential backoff capped at 3s
        return Math.min(times * 100, 3000);
      },
      enableReadyCheck: true,
      lazyConnect: false,
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connection established');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.logger.log('Redis client ready');
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      this.logger.error(`Redis connection error: ${err.message}`);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      this.logger.warn('Redis connection closed');
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
        this.logger.log('Redis client disconnected cleanly');
      } catch (err) {
        this.logger.error(`Error disconnecting Redis client: ${err.message}`);
      }
    }
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }
}
