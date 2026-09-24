import VideoController from '@/adapters/http/controller/video-controller';
import express from 'express';

export default function VideoRoutes(controller: VideoController) {
  const router = express.Router();

  // upload — single & multipart
  router.post('/presign', controller.presignUpload);
  router.post('/multipart', controller.createMultipart);
  router.post('/:id/multipart/parts/presign', controller.presignParts);
  router.post('/:id/multipart/complete', controller.completeMultipart);

  // transcoding trigger
  router.post('/:id/complete', controller.uploadComplete);

  // tracking & query
  router.get('/', controller.findAll);
  router.get('/:id', controller.findOne);
  router.post('/', controller.create);
  router.get('/:id/progress', controller.realtimeProgress);

  return router;
}
