import QueueWorker from '@/adapters/events';
import VideoController from '@/adapters/http/controller/video-controller';
import express from '@/adapters/http/webserver/express';
import { Controllers } from '@/domain/adapters/controller.interface';
import { UseCases } from '@/domain/use-cases/use-case.interface';
import progressHub from '@/infrastructure/redis/progress-hub';
import RedisConnection from '@/infrastructure/redis/redis-connection';
import sseRegistry from '@/infrastructure/sse/sse-registry';
import BullMqRepository from '@/repositories/bullmq/bullmq-repository';
import { Express } from 'express';
import DeleteVideoJobListener from './use-cases/delete/delete-video-job-listener';
import TranscodeJobListener from './use-cases/transcode/transcode-job-listener';
import DeleteVideo from './use-cases/video/delete-video';
import FindAllVideo from './use-cases/video/find-all-video';
import FindByIdVideo from './use-cases/video/find-by-id-video';
import RealtimeProgressVideo from './use-cases/video/realtime-progress-video';
import CompleteMultipartUpload from './use-cases/video/upload/complete-multipart-upload';
import CompleteUpload from './use-cases/video/upload/complete-upload';
import GenerateMultipartPresignUrl from './use-cases/video/upload/generate-multipart-presign-url';
import GeneratePresignUrl from './use-cases/video/upload/generate-presign-url';
import PresignPartUrl from './use-cases/video/upload/presign-part-url';

export default async function bootstrap(app: Express) {
  const useCases = await setupUseCases();
  const controllers = setupControllers(useCases);

  const bullMqRepository = new BullMqRepository();
  const worker = new QueueWorker(useCases, bullMqRepository);
  worker.listenTranscodingQueue();
  worker.listenDeleteQueue();

  express(app, controllers, useCases, bullMqRepository);

  // Graceful shutdown: tutup koneksi SSE, subscriber Redis, worker/queue
  return async () => {
    sseRegistry.closeAll();
    await progressHub.close();
    await bullMqRepository.close();
  };
}

async function setupUseCases(): Promise<UseCases> {
  const redisClient = await RedisConnection();

  return {
    videoUseCase: {
      findAllVideo: new FindAllVideo(redisClient),
      findByIdVideo: new FindByIdVideo(redisClient),
      generatePresignUrl: new GeneratePresignUrl(redisClient),
      GenerateMultipartPresignUrl: new GenerateMultipartPresignUrl(redisClient),
      presignPartUrl: new PresignPartUrl(redisClient),
      completeMultipartUpload: new CompleteMultipartUpload(redisClient),
      CompleteUpload: new CompleteUpload(redisClient),
      realtimeProgressVideo: new RealtimeProgressVideo(redisClient),
      deleteVideo: new DeleteVideo(redisClient),
    },
    transcodeUseCase: { transcodeJobListener: new TranscodeJobListener(redisClient) },
    deleteUseCase: { deleteVideoJobListener: new DeleteVideoJobListener(redisClient) },
  };
}

function setupControllers(useCases: UseCases): Controllers {
  return {
    videoController: new VideoController(useCases),
  };
}
