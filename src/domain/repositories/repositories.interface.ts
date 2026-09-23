import RabbitmqRepository from '@/repositories/bullmq/bullmq-repository';
import VideoRepository from '@/repositories/database/video-repository';
import S3StorageRepository from '@/repositories/filesystem/s3-storage-repository';
import RedisRepository from '@/repositories/redis/redis-repository';

export interface Repositories {
  videoRepository: VideoRepository;
  tools: {
    storageRepository: S3StorageRepository;
    rabbitmqRepository: RabbitmqRepository;
    redisRepository: RedisRepository;
  };
}

export default Repositories;
