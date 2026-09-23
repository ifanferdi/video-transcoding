import config from '@/config/storage.config';
import { ErrorBadRequest, ErrorNotFound } from '@/helpers/error.helper';
import BaseUseCase from '@/use-cases/_base-use-case';
import { PresignPartDto } from '@/validations/video-validation';

const MAX_PARTS = 10000;

/**
 * Fase 5 — Presigned URL untuk satu atau beberapa part multipart upload.
 * Batch: client kirim daftar partNumbers, backend balikin URL per part.
 */
export default class PresignPartUrl extends BaseUseCase {
  async execute(id: number, body: PresignPartDto) {
    const { uploadId, partNumbers } = body;

    const video = await this.repositories.videoRepository.findOne({ id });
    if (!video) throw new ErrorNotFound('Video not found.');

    if (partNumbers.some((n) => n > MAX_PARTS)) {
      throw new ErrorBadRequest(`Part number max is ${MAX_PARTS}`);
    }

    const session = await this.getMultipartSession(uploadId);
    if (!session) throw new ErrorBadRequest('Invalid or expired uploadId.');

    const presignedParts = await Promise.all(
      partNumbers.map(async (partNumber) => ({
        partNumber,
        presignUrl: await this.repositories.tools.storageRepository.presignPartUrl(
          session.key,
          uploadId,
          partNumber,
        ),
      })),
    );

    return {
      key: session.key,
      expiresIn: config.expiredTime,
      parts: presignedParts,
    };
  }

  private async getMultipartSession(uploadId: string) {
    const redisRepository = this.repositories.tools.redisRepository;

    if (redisRepository) {
      return redisRepository.get<{ id: number; key: string }>(`multipart:${uploadId}`);
    }

    return null;
  }
}
