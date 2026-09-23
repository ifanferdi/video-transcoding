import BaseUseCase from '@/use-cases/_base-use-case';
import { CreateVideoDto } from '@/validations/video-validation';

/**
 * Create video record manual (tanpa presign flow) — untuk admin/seed.
 */
export default class CreateVideo extends BaseUseCase {
  async execute(body: CreateVideoDto) {
    return await this.repositories.videoRepository.store(body);
  }
}
