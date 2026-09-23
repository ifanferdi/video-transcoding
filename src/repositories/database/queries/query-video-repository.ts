import { Prisma } from '@/infrastructure/database/prisma/generated/client';
import { VideoScalarFieldEnum } from '@/infrastructure/database/prisma/generated/internal/prismaNamespace';
import { FindAllVideoDto, FindByIdVideoDto } from '@/validations/video-validation';

type VIDEO_FIELD = (typeof VideoScalarFieldEnum)[keyof typeof VideoScalarFieldEnum];

const VIDEO_FIELDS = Object.keys(VideoScalarFieldEnum) as VIDEO_FIELD[];

export default class QueryVideoRepository {
  // handleInclude(relation: FindAllVideoDto['with'] & FindByIdVideoDto['with']) {
  //   const include: VideoInclude = {};

  //   return Object.keys(include).length ? include : undefined;
  // }

  handleWhere(params: Omit<Partial<FindAllVideoDto & FindByIdVideoDto>, 'columns' | 'orderBy'>) {
    const where: Prisma.VideoWhereInput = {};

    if (params.id) where.id = params.id;
    if (params.ids?.length) where.id = { in: params.ids };
    if (params.status)
      where.status = Array.isArray(params.status) ? { in: params.status } : params.status;

    return where;
  }

  handleOrderBy(params: Pick<FindAllVideoDto, 'orderBy'>) {
    if (!params.orderBy) return [{ createdAt: 'desc' }] as Record<string, 'asc' | 'desc'>[];

    return params.orderBy.map(({ field, direction }) => ({
      [field]: direction ?? 'asc',
    })) as Record<string, 'asc' | 'desc'>[];
  }

  handleSelect(cols: readonly VIDEO_FIELD[] = VIDEO_FIELDS) {
    const select: Prisma.VideoSelect = {};

    if (cols && cols.length > 0) cols.forEach((c) => ((select as any)[c] = true));

    return select;
  }
}
