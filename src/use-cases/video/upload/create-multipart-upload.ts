import config from '@/config/storage.config';
import { VideoStatus } from '@/domain/entities/enums/video.enum';
import BaseUseCase from '@/use-cases/_base-use-case';
import { CreateMultipartDto, validateVideoExtension } from '@/validations/video-validation';
import { randomUUID } from 'crypto';

/**
 * Fase 5 — Multipart upload init untuk file besar.
 * Flow: create video record + createMultipartUpload → uploadId.
 * Client minta presigned URL per-part via /parts/presign, lalu complete.
 */
export default class CreateMultipartUpload extends BaseUseCase {
  async execute(body: CreateMultipartDto) {
    const { filename: title, fileSize, contentType } = body;
    const ext = validateVideoExtension(title);

    const sourceKey = `videos/source/${new Date().getFullYear()}/${randomUUID()}.${ext}`;

    const video = await this.repositories.videoRepository.store({
      title,
      sourceKey,
      fileSize,
      status: VideoStatus.UPLOADING,
    });

    const uploadId = await this.repositories.tools.storageRepository.createMultipartUpload(
      sourceKey,
      contentType,
    );

    // simpan uploadId → key mapping di Redis (TTL 24 jam)
    const redisRepository = this.redisRepository;
    if (redisRepository) {
      await redisRepository.set(
        `multipart:${uploadId}`,
        { id: video.id, key: sourceKey },
        60 * 60 * 24,
      );
    }

    const chunkSize = config.video.multipartChunkSize;
    const totalParts = Math.ceil(fileSize / chunkSize);
    console.log({ totalParts, fileSize, chunkSize });

    const presignPartUrls = await Promise.all(
      Array.from(
        { length: totalParts },
        async (_, i) =>
          await this.repositories.tools.storageRepository.presignPartUrl(
            sourceKey,
            uploadId,
            i + 1,
          ),
      ),
    );

    return {
      video,
      upload: {
        key: sourceKey,
        uploadId,
        chunkSize,
        totalParts,
        expiresIn: config.expiredTime,
        presignPartUrls,
      },
    };
  }

  private get redisRepository() {
    // Redis opsional di fase awal; fallback: client kirim key saat complete
    return this.repositories.tools.redisRepository;
  }
}
