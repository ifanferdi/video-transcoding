import { ErrorNotFound } from '@/helpers/error.helper';
import BaseUseCase from '@/use-cases/_base-use-case';
import { CreateVideoDto } from '@/validations/video-validation';

/**
 * Create video record manual (tanpa presign flow) — untuk admin/seed.
 */
export default class CreateVideo extends BaseUseCase {
  async execute(body: CreateVideoDto) {
    const isExist = await this.repositories.tools.storageRepository.isExist(body.sourceKey);
    if (!isExist) throw new ErrorNotFound('Source file not found in storage.');

    return await this.repositories.videoRepository.store(body);
  }
}
