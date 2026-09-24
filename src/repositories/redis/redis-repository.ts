import config from '@/config/config';
import { RedisClient } from 'bun';

const TTL_SECONDS = config.redis.ttlSeconds;
const SNAPSHOT_KEY = config.redis.snapshotKey;

export default class RedisRepository {
  constructor(protected redisClient: RedisClient) {}

  async get<T = string>(key: string): Promise<T | null> {
    const value = await this.redisClient.get(key);
    if (value === null) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set(key: string, value: any, expiredTime?: number) {
    const payload = typeof value === 'string' ? value : JSON.stringify(value);

    if (expiredTime) return await this.redisClient.set(key, payload, 'EX', expiredTime);

    return await this.redisClient.set(key, payload);
  }

  async delete(key: string) {
    return await this.redisClient.del(key);
  }

  async publish(channel: string, payload: string) {
    // 1. Publish ke channel
    await this.redisClient.publish(channel, payload);

    // 2. Simpan snapshot
    await this.set(`${SNAPSHOT_KEY}:${channel}`, payload, TTL_SECONDS);
  }
}
