import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../shared/errors.js';

type HandledError = Error & { validation?: unknown; statusCode?: number; code?: string };

const MENSAJES_FASTIFY: Record<string, { status: number; code: string; message: string }> = {
  FST_ERR_CTP_BODY_TOO_LARGE: { status: 413, code: 'cuerpo_muy_grande', message: 'La solicitud es demasiado grande.' },
  FST_ERR_CTP_EMPTY_JSON_BODY: { status: 400, code: 'invalid_request', message: 'Faltan los datos de la solicitud.' },
  FST_ERR_CTP_INVALID_MEDIA_TYPE: { status: 415, code: 'tipo_no_admitido', message: 'Formato de solicitud no admitido.' },
  FST_REQ_FILE_TOO_LARGE: { status: 413, code: 'foto_muy_grande', message: 'La foto pesa más de 5 MB.' },
  FST_FILES_LIMIT: { status: 400, code: 'demasiados_archivos', message: 'Solo se admite una foto por solicitud.' },
  FST_PARTS_LIMIT: { status: 400, code: 'invalid_request', message: 'La solicitud trae demasiadas partes.' },
  FST_FIELDS_LIMIT: { status: 400, code: 'invalid_request', message: 'La solicitud trae demasiados campos.' },
  FST_INVALID_MULTIPART_CONTENT_TYPE: { status: 400, code: 'invalid_request', message: 'La solicitud debe enviarse como formulario con archivos.' },
  FST_MP_PREMATURE_CLOSE: { status: 400, code: 'invalid_request', message: 'El formulario llegó incompleto. Vuelve a enviarlo.' },
};

// El lector de formularios (busboy) lanza errores sin código cuando el cuerpo viene cortado o mal armado.
const FORMULARIO_MAL_ARMADO = /unexpected end of multipart data|^Multipart: Boundary not found$|^Boundary required$/i;

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err: HandledError, req, reply) => {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') return reply.code(404).send({ error: { code: 'not_found', message: 'No encontramos lo que buscas.' } });
      if (err.code === 'P2002') return reply.code(409).send({ error: { code: 'conflict', message: 'Ya existe un registro con esos datos.' } });
    }
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } });
    }
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: { code: 'invalid_request', message: 'Revisa los datos enviados.', details: err.flatten() } });
    }
    const sc = err.statusCode;
    if (sc === 429) {
      return reply.code(429).send({ error: { code: 'rate_limited', message: 'Demasiados intentos. Espera un momento y vuelve a intentarlo.' } });
    }
    if (!sc && FORMULARIO_MAL_ARMADO.test(err.message)) {
      return reply.code(400).send({ error: { code: 'invalid_request', message: 'El formulario llegó incompleto o mal armado. Vuelve a enviarlo.' } });
    }
    const conocido = err.code ? MENSAJES_FASTIFY[err.code] : undefined;
    if (conocido) {
      return reply.code(conocido.status).send({ error: { code: conocido.code, message: conocido.message } });
    }
    if (sc && sc < 500) {
      req.log.warn({ err }, 'client error');
      return reply.code(sc).send({ error: { code: 'bad_request', message: 'No pudimos procesar la solicitud.' } });
    }
    req.log.error({ err }, 'unhandled error');
    return reply.code(500).send({ error: { code: 'internal_error', message: 'Error interno. Vuelve a intentarlo en un momento.' } });
  });

  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({ error: { code: 'not_found', message: 'Ruta no encontrada.' } });
  });
}
