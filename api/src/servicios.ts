import type { PrismaClient } from '@prisma/client';
import type { Correos } from './correos/correos.js';

export interface Servicios {
  db: PrismaClient;
  correos: Correos;
  archivosDir: string;
  /** Los límites por IP viven en memoria del proceso; las pruebas que no los miden los apagan. */
  limitesPorIp: boolean;
}
