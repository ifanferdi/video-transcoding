import 'dotenv/config';
import databaseConfig from './database.config';
import storageConfig from './storage.config';

const APP_PORT = process.env.APP_PORT || 8100;

const config = {
  app: {
    name: process.env.APP_NAME || 'Video Transcoding API',
    version: process.env.APP_VERSION || '1.0.0',
    env: (process.env.APP_ENV?.toLowerCase() || 'development') as
      'development' | 'staging' | 'production',
    port: APP_PORT,
    url: process.env.APP_URL || `http://localhost:${APP_PORT}`,
  },
  database: databaseConfig,
  storage: storageConfig,
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5673',
    exchange: process.env.RABBITMQ_EXCHANGE || 'video_exchange',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6381',
    ttlSeconds: process.env.REDIS_TTL_SECONDS ? Number(process.env.REDIS_TTL_SECONDS) : 60 * 6, // 6 jam
    progressChannelPrefix: process.env.PROGRESS_CHANNEL_PREFIX || 'progress',
    progressActiveKey: process.env.PROGRESS_ACTIVE_KEY || 'progress:active',
  },
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim()),
  },
};

export default config;
