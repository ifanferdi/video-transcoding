import config from '@/config/storage.config';
import { ErrorBadRequest } from '@/helpers/error.helper';
import { VideoStatus } from '@/infrastructure/database/prisma/generated/enums';
import BaseUseCase from '@/use-cases/_base-use-case';
import { PresignUploadDto } from '@/validations/video-validation';
import { randomUUID } from 'crypto';
import moment from 'moment';

/**
 * Fase 1 — Presigned upload (single PUT).
 * Flow: create video record (status=uploading) + generate presigned PUT URL.
 * Client upload langsung ke storage, backend tidak memproses file.
 */
export default class GeneratePresignUrl extends BaseUseCase {
  async execute(body: PresignUploadDto) {
    const { filename: title, fileSize } = body;

    if (fileSize > config.maxSize)
      throw new ErrorBadRequest(
        `File too large for single upload (${fileSize} bytes). Use multipart upload endpoint.`,
      );

    const ext = title.split('.').pop();
    const sourceKey = `videos/source/${new Date().getFullYear()}/${randomUUID()}.${ext}`;

    const expiredTime = config.expiredTime;
    const presignUrl = await this.repositories.tools.storageRepository.getPresignUrl(
      sourceKey,
      fileSize,
      config.expiredTime,
    );

    const video = await this.repositories.videoRepository.store({
      title,
      sourceKey,
      status: VideoStatus.uploading,
    });

    return {
      ...video,
      upload: {
        key: sourceKey,
        method: 'PUT',
        presignUrl,
        expiresAt: moment().add(expiredTime, 'seconds').toDate(),
      },
    };
  }
}
