import { Repositories } from '@/domain/repositories/repositories.interface';
import RabbitmqRepository from '@/repositories/bullmq/bullmq-repository';
import VideoRepository from '@/repositories/database/video-repository';
import S3StorageRepository from '@/repositories/filesystem/s3-storage-repository';
import RedisRepository from '@/repositories/redis/redis-repository';
import { RedisClient } from 'bun';

export default abstract class BaseUseCase {
  protected repositories: Repositories;

  constructor(protected redisClient: RedisClient) {
    this.repositories = {
      videoRepository: new VideoRepository(),
      tools: {
        storageRepository: new S3StorageRepository(),
        rabbitmqRepository: new RabbitmqRepository(),
        redisRepository: new RedisRepository(this.redisClient),
      },
    };
  }
}
