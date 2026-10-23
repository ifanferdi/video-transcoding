import config from '@/config/config';
import { RedisClient } from 'bun';

const REDIS_URL = config.redis.url;

export default async function RedisConnection() {
  const redisClient = CreateRedisConnection();

  await redisClient.connect();
  console.log(`✅  Redis connected to: ${REDIS_URL}`);

  return redisClient;
}

export const CreateRedisConnection = () => new RedisClient(REDIS_URL);
