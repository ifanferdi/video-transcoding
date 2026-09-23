import QueueWorker from '@/adapters/events';
import VideoController from '@/adapters/http/controller/video-controller';
import express from '@/adapters/http/webserver/express';
import { Controllers } from '@/domain/adapters/controller.interface';
import { UseCases } from '@/domain/use-cases/use-case.interface';
import RedisConnection from '@/infrastructure/redis/redis-connection';
import BullMqRepository from '@/repositories/bullmq/bullmq-repository';
import { Express } from 'express';
import TranscodeJobListener from './use-cases/transcode/transcode-job-listener';
import CreateVideo from './use-cases/video/create-video';
import FindAllVideo from './use-cases/video/find-all-video';
import FindByIdVideo from './use-cases/video/find-by-id-video';
import CompleteMultipartUpload from './use-cases/video/upload/complete-multipart-upload';
import CreateMultipartUpload from './use-cases/video/upload/create-multipart-upload';
import GeneratePresignUrl from './use-cases/video/upload/generate-presign-url';
import PresignPartUrl from './use-cases/video/upload/presign-part-url';
import UploadComplete from './use-cases/video/upload/upload-complete';

export default async function bootstrap(app: Express) {
  const useCases = await setupUseCases();
  const controllers = setupControllers(useCases);

  const bullMqRepository = new BullMqRepository();
  const worker = new QueueWorker(useCases, bullMqRepository);
  worker.listenTranscodingQueue();

  express(app, controllers, useCases, bullMqRepository);

  // Graceful shutdown: tunggu job aktif selesai, tutup worker/queue/koneksi Redis
  return async () => {
    await bullMqRepository.close();
  };
}

async function setupUseCases(): Promise<UseCases> {
  const redisClient = await RedisConnection();

  return {
    videoUseCase: {
      findAllVideo: new FindAllVideo(redisClient),
      findByIdVideo: new FindByIdVideo(redisClient),
      createVideo: new CreateVideo(redisClient),
      generatePresignUrl: new GeneratePresignUrl(redisClient),
      createMultipartUpload: new CreateMultipartUpload(redisClient),
      presignPartUrl: new PresignPartUrl(redisClient),
      completeMultipartUpload: new CompleteMultipartUpload(redisClient),
      uploadComplete: new UploadComplete(redisClient),
    },
    transcodeUseCase: { transcodeJobListener: new TranscodeJobListener(redisClient) },
  };
}

function setupControllers(useCases: UseCases): Controllers {
  return {
    videoController: new VideoController(useCases),
  };
}
