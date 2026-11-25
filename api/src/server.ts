import { createHmac } from 'node:crypto';
import { resolve } from 'node:path';
import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { logger } from './shared/logger.js';
import { prisma, disconnectPrisma } from './shared/prisma.js';
import { isMain } from './shared/entrypoint.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerRoutes } from './routes.js';
import { COOKIE_CLIENTE } from './modulos/clientes/sesion.js';
import { COOKIE_PANEL } from './modulos/panel/sesion.js';
import { crearCorreos, reintentarPendientesAlArrancar, vaciarEnvios } from './correos/correos.js';
import { transporteSmtp, type Transporte } from './correos/transporte.js';
import { MAX_BYTES_FOTO } from './modulos/cotizaciones/foto.js';
import { programarLimpiezaFotos } from './modulos/cotizaciones/limpieza-fotos.js';

export interface OpcionesServidor {
  transporteCorreo?: Transporte;
  /** Los límites por IP viven en memoria del proceso; las pruebas que no los miden los apagan. */
  limitesPorIp?: boolean;
}

const secretoDerivado = (uso: string) => createHmac('sha256', env.JWT_SECRET).update(uso).digest('base64url');

export async function buildServer(opciones: OpcionesServidor = {}): Promise<FastifyInstance> {
  const loggerInstance: FastifyBaseLogger = logger;
  const app = Fastify({
    loggerInstance,
    requestIdHeader: 'x-request-id',
    bodyLimit: 32 * 1024,
    requestTimeout: 60_000,
    trustProxy: env.TRUST_PROXY,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cookie);
  // Cada tipo de sesión firma con su propio secreto: la cookie de un cliente nunca abre el panel.
  await app.register(jwt, {
    secret: secretoDerivado('sesion-cliente'),
    namespace: 'cliente',
    sign: { algorithm: 'HS256' },
    verify: { algorithms: ['HS256'] },
    cookie: { cookieName: COOKIE_CLIENTE, signed: false },
  });
  await app.register(jwt, {
    secret: secretoDerivado('sesion-panel'),
    namespace: 'panel',
    sign: { algorithm: 'HS256' },
    verify: { algorithms: ['HS256'] },
    cookie: { cookieName: COOKIE_PANEL, signed: false },
  });
  await app.register(multipart, {
    limits: { fileSize: MAX_BYTES_FOTO, files: 1, fields: 4, fieldSize: 32 * 1024, parts: 6, headerPairs: 50 },
  });
  if (opciones.limitesPorIp !== false) await app.register(rateLimit, { global: false });

  registerErrorHandler(app);

  app.get('/api/health', async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  });

  if (!opciones.transporteCorreo && env.NODE_ENV === 'test') throw new Error('las pruebas pasan su propio transporte de correo: nunca usan el SMTP');
  const correos = crearCorreos(prisma, opciones.transporteCorreo ?? transporteSmtp(env), {
    avisos: env.CORREO_AVISOS_CAVI,
    ctx: { sitio: env.SITIO_URL, correoConsultas: env.CORREO_AVISOS_CAVI },
    log: app.log,
  });
  await registerRoutes(app, { db: prisma, correos, archivosDir: resolve(env.ARCHIVOS_DIR), limitesPorIp: opciones.limitesPorIp !== false });

  app.addHook('onClose', async () => {
    await vaciarEnvios();
    await disconnectPrisma();
  });
  return app;
}

async function main(): Promise<void> {
  const arranque = new Date();
  const transporte = transporteSmtp(env);
  const app = await buildServer({ transporteCorreo: transporte });
  const detenerLimpieza = programarLimpiezaFotos(prisma, resolve(env.ARCHIVOS_DIR), { retencionDias: env.FOTOS_RETENCION_DIAS, log: app.log });
  app.addHook('onClose', async () => detenerLimpieza());
  let cerrando = false;
  const apagar = async (senal: string) => {
    if (cerrando) return;
    cerrando = true;
    logger.info({ senal }, 'cavi api: cerrando');
    try {
      await app.close();
      process.exit(0);
    } catch (e) {
      logger.error({ err: e }, 'error al cerrar');
      process.exit(1);
    }
  };
  process.on('SIGINT', () => void apagar('SIGINT'));
  process.on('SIGTERM', () => void apagar('SIGTERM'));

  try {
    await app.listen({ host: env.HOST, port: env.PORT });
  } catch (e) {
    if (e instanceof Error && 'code' in e && e.code === 'EADDRINUSE') {
      logger.fatal(`el puerto ${env.PORT} está ocupado: detén el otro proceso o cambia PORT en .env`);
    } else {
      logger.error({ err: e }, 'no se pudo arrancar');
    }
    process.exit(1);
  }
  reintentarPendientesAlArrancar(prisma, transporte, app.log, arranque);
}

if (isMain(import.meta.url)) void main();
