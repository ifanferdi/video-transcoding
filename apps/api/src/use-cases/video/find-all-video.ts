import config from '@/config/config';
import { ResponseVideo } from '@/domain/entities/models/video';
import { paginate } from '@/helpers/paginate.helper';
import BaseUseCase from '@/use-cases/_base-use-case';
import { FindAllVideoDto } from '@/validations/video-validation';
import moment from 'moment';

export default class FindAllVideo extends BaseUseCase {
  async execute(params: Partial<FindAllVideoDto> = {}) {
    const page = params?.page || 1;
    const limit = params?.limit || 10;

    let [videos, total] = await Promise.all([
      this.repositories.videoRepository.findAll<Omit<ResponseVideo, 'playback'>>({
        ...params,
        page,
        limit,
      }),
      this.repositories.videoRepository.count(params),
    ]);

    const expiresIn = config.storage.expiredTime;
    videos = await Promise.all(
      videos.map(async (video): Promise<ResponseVideo> => ({
        ...video,
        playback: {
          expiresIn: moment().add(expiresIn, 'seconds').toDate(),
          masterUrl: video.hlsKey
            ? await this.repositories.tools.storageRepository.getUrl(video.hlsKey, expiresIn)
            : undefined,
          thumbnailUrl: video.thumbnailKey
            ? await this.repositories.tools.storageRepository.getUrl(video.thumbnailKey)
            : undefined,
        },
      })),
    );

    return paginate(videos, total, page, limit);
  }
}
