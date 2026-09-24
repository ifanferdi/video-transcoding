import config from '@/config/config';
import { ErrorNotFound } from '@/helpers/error.helper';
import { VideoStatus } from '@/infrastructure/database/prisma/generated/enums';
import BaseUseCase from '@/use-cases/_base-use-case';
import { FindByIdVideoDto } from '@/validations/video-validation';
/**
 * Fase 4 — Job status & progress tracking + playback URL.
 * Kalau video ready, generate playback URL (signed, kecuali bucket public-read).
 */
export default class FindByIdVideo extends BaseUseCase {
  async execute({ id, ...params }: FindByIdVideoDto) {
    const video = await this.repositories.videoRepository.findOne({ id, ...params });
    if (!video) throw new ErrorNotFound('Video not found.');

    let playback: { masterM3u8Url: string; expiresIn?: number } | null = null;

    if (video.status === VideoStatus.ready && video.hlsKey) {
      const masterUrl = await this.repositories.tools.storageRepository.getUrl(video.hlsKey);
      playback = { masterM3u8Url: masterUrl, expiresIn: config.storage.expiredTime };
    }

    return { video, playback };
  }
}
