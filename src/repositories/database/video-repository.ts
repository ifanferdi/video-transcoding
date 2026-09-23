import { Repository } from '@/domain/repositories/database.interface';
import { Prisma, Video } from '@/infrastructure/database/prisma/generated/client';
import { BatchPayload } from '@/infrastructure/database/prisma/generated/internal/prismaNamespace';
import DatabaseBaseRepository from '@/repositories/database/_database-base-repository';
import {
  CreateVideoDto,
  FindAllVideoDto,
  FindByIdVideoDto,
  UpdateVideoDto,
} from '@/validations/video-validation';

export default class VideoRepository
  extends DatabaseBaseRepository
  implements Repository<FindAllVideoDto, FindByIdVideoDto, CreateVideoDto, UpdateVideoDto>
{
  async findAll<T = Video>(params: Partial<FindAllVideoDto>) {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * Number(limit);

    const query: Prisma.VideoFindManyArgs = {
      skip: offset,
      take: limit === -1 ? undefined : limit,
      where: this.queryVideoRepository.handleWhere(params),
      orderBy: this.queryVideoRepository.handleOrderBy(params),
      select: this.queryVideoRepository.handleSelect(params?.columns),
    };

    return this.prisma.video.findMany(query) as Promise<T[]>;
  }

  count(params: Partial<FindAllVideoDto>) {
    return this.prisma.video.count({ where: this.queryVideoRepository.handleWhere(params) });
  }

  async findOne<T = Video>(params: FindByIdVideoDto) {
    return this.prisma.video.findFirst({
      where: this.queryVideoRepository.handleWhere(params),
      select: this.queryVideoRepository.handleSelect(params?.columns),
    }) as Promise<T | null>;
  }

  async store<T = Video>(data: CreateVideoDto) {
    return this.prisma.video.create({ data }).finally() as Promise<T>;
  }

  bulkStore<T = Video>(data: CreateVideoDto[]) {
    return this.prisma.video.createManyAndReturn({ data, skipDuplicates: true }) as Promise<T[]>;
  }

  update<T = Video>(data: UpdateVideoDto) {
    return this.prisma.video.update({ where: { id: data.id }, data }).finally() as Promise<T>;
  }

  destroy<T = BatchPayload | Video>(id: number | number[]) {
    if (id instanceof Array)
      return this.prisma.video.deleteMany({ where: { id: { in: id } } }) as Promise<T>;

    return this.prisma.video.delete({ where: { id } }).finally() as Promise<T>;
  }
}
