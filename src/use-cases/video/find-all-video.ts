import { buildMeta } from '@/helpers/paginate.helper';
import BaseUseCase from '@/use-cases/_base-use-case';
import { FindAllVideoDto } from '@/validations/video-validation';

export default class FindAllVideo extends BaseUseCase {
  async execute(params: Partial<FindAllVideoDto> = {}) {
    const page = params?.page || 1;
    const limit = params?.limit || 10;

    const [videos, total] = await Promise.all([
      this.repositories.videoRepository.findAll({ ...params, page, limit }),
      this.repositories.videoRepository.count(params),
    ]);

    return { data: videos, meta: buildMeta(total, page, limit === -1 ? total || 1 : limit) };
  }
}
