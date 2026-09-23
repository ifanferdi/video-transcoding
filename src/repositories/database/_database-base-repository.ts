import { prisma } from '@/infrastructure/database/prisma/prisma';
import QueryVideoRepository from './queries/query-video-repository';

export default abstract class DatabaseBaseRepository {
  protected queryVideoRepository = new QueryVideoRepository();
  protected prisma = prisma;

  constructor() {}
}
