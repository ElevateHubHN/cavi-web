import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

export const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL, log: [] });

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
