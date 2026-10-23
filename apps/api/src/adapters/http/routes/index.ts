import VideoRoutes from '@/adapters/http/routes/video.routes';
import { Controllers } from '@/domain/adapters/controller.interface';
import { Express } from 'express';

export default function Routes(app: Express, controllers: Controllers) {
  app.use('/api/v1/videos', VideoRoutes(controllers.videoController));
}
