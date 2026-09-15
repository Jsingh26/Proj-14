import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from './redis.service';

const RELEASE_LOCK_LUA_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Attempts to acquire a distributed lock in Redis for the given key.
   * Uses SET key token NX PX ttlMs.
   * Returns { acquired: true, token } if successful, or { acquired: false } if locked.
   * Throws ServiceUnavailableException if Redis is down/unreachable.
   */
  async acquireLock(
    key: string,
    ttlMs = 5000,
  ): Promise<{ acquired: boolean; token?: string }> {
    try {
      const client = this.redisService.getClient();
      const token = uuidv4();

      // SET key token NX PX ttlMs
      const result = await client.set(key, token, 'PX', ttlMs, 'NX');

      if (result === 'OK') {
        this.logger.debug(`Lock acquired for key "${key}" with token "${token}" (TTL: ${ttlMs}ms)`);
        return { acquired: true, token };
      }

      this.logger.warn(`Failed to acquire lock for key "${key}" - lock already held`);
      return { acquired: false };
    } catch (error) {
      this.logger.error(
        `Redis error while attempting to acquire lock for "${key}": ${error.message}`,
        error.stack,
      );
      throw new ServiceUnavailableException(
        'Distributed lock service is currently unavailable. Please try again.',
      );
    }
  }

  /**
   * Safely releases the distributed lock using a Redis Lua script.
   * Only deletes the key if the token in Redis matches the provided token.
   * This prevents accidentally deleting another request's lock if the TTL expired.
   */
  async releaseLock(key: string, token: string): Promise<boolean> {
    try {
      const client = this.redisService.getClient();
      const result = await client.eval(RELEASE_LOCK_LUA_SCRIPT, 1, key, token);

      const released = result === 1;
      if (released) {
        this.logger.debug(`Lock released for key "${key}" with token "${token}"`);
      } else {
        this.logger.warn(
          `Lock for key "${key}" was not released because token did not match or TTL expired`,
        );
      }
      return released;
    } catch (error) {
      this.logger.error(
        `Redis error while releasing lock for "${key}": ${error.message}`,
        error.stack,
      );
      // Even if releasing fails, TTL will expire automatically.
      return false;
    }
  }
}
