import config from '@/config/config';
import { PrismaClient } from '@/infrastructure/database/prisma/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, PoolConfig } from 'pg';

const connectionString = config.database.url;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const poolConfig: PoolConfig = { connectionString, max: 5 };
const adapter = new PrismaPg(new Pool(poolConfig));

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: config.app.env === 'production' ? ['error'] : ['warn', 'error', 'query', 'info'],
  });

if (config.app.env !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { prisma };
