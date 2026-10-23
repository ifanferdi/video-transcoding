import VideoRoutes from '@/adapters/http/routes/video.routes';
import { Controllers } from '@/domain/adapters/controller.interface';
import { Express } from 'express';

export default function Routes(app: Express, controllers: Controllers) {
  app.use('/api/v1/videos', VideoRoutes(controllers.videoController));

  app.get('/api/v1/sse/videos/progress', controllers.videoController.realtimeProgress);
}
