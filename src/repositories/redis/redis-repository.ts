import { RedisClient } from 'bun';

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
    await this.redisClient.publish(channel, payload);
  }

  async hset(key: string, field: string, value: unknown, expiredTime?: number) {
    await this.redisClient.hset(
      key,
      field,
      typeof value === 'string' ? value : JSON.stringify(value),
    );
    if (expiredTime) await this.redisClient.expire(key, expiredTime);
  }

  async hdel(key: string, field: string) {
    return this.redisClient.hdel(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.redisClient.hgetall(key);
  }
}
