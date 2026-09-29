import config from '@/config/config';
import { ResponseVideo } from '@/domain/entities/models/video';
import { ErrorNotFound } from '@/helpers/error.helper';
import { VideoStatus } from '@/infrastructure/database/prisma/generated/enums';
import BaseUseCase from '@/use-cases/_base-use-case';
import { FindByIdVideoDto } from '@/validations/video-validation';
import moment from 'moment';
/**
 * Fase 4 — Job status & progress tracking + playback URL.
 * Kalau video ready, generate playback URL (signed, kecuali bucket public-read).
 */
export default class FindByIdVideo extends BaseUseCase {
  async execute({ id, ...params }: FindByIdVideoDto) {
    const video = await this.repositories.videoRepository.findOne<ResponseVideo>({ id, ...params });
    if (!video) throw new ErrorNotFound('Video not found.');

    if (video.status === VideoStatus.ready) {
      const expiresIn = config.storage.expiredTime;
      video.playback = { expiresIn: moment().add(expiresIn, 'seconds').toDate() };
      if (video.hlsKey)
        video.playback.masterUrl = await this.repositories.tools.storageRepository.getUrl(
          video.hlsKey,
          expiresIn,
        );
      if (video.thumbnailKey)
        video.playback.thumbnailUrl = await this.repositories.tools.storageRepository.getUrl(
          video.thumbnailKey,
          expiresIn,
        );
    }

    return video;
  }
}
