import { ErrorBadRequest, ErrorNotFound } from '@/helpers/error.helper';
import { VideoStatus } from '@/infrastructure/database/prisma/generated/enums';
import BaseUseCase from '@/use-cases/_base-use-case';
import { CompleteMultipartDto } from '@/validations/video-validation';
/**
 * Fase 5 — Complete multipart upload.
 * Flow: validasi session → completeMultipartUpload ke S3 → verifikasi file ada.
 * Status video tetap `uploading` sampai client trigger transcode.
 */
export default class CompleteMultipartUpload extends BaseUseCase {
  async execute(id: number, body: CompleteMultipartDto) {
    const { uploadId, parts } = body;

    const session = await this.getMultipartSession(uploadId);
    if (!session) throw new ErrorBadRequest('Invalid or expired uploadId.');

    if (session.id !== id) {
      throw new ErrorBadRequest('uploadId does not belong to this video.');
    }

    const video = await this.repositories.videoRepository.findOne({ id });
    if (!video) throw new ErrorNotFound('Video not found.');

    await this.repositories.tools.storageRepository.completeMultipartUpload(
      session.key,
      uploadId,
      parts,
    );

    const isExist = await this.repositories.tools.storageRepository.isExist(session.key);
    if (!isExist) throw new ErrorBadRequest('Upload verification failed. Source object missing.');

    const updatedVideo = await this.repositories.videoRepository.update({
      id: id,
      status: VideoStatus.uploading,
    });

    // bersihkan session Redis
    const redisRepository = this.repositories.tools.redisRepository;
    if (redisRepository) await redisRepository.delete(`multipart:${uploadId}`);

    return { video: updatedVideo };
  }

  private async getMultipartSession(uploadId: string) {
    const redisRepository = this.repositories.tools.redisRepository;

    if (redisRepository) {
      return redisRepository.get<{ id: number; key: string }>(`multipart:${uploadId}`);
    }

    return null;
  }
}
