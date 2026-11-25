import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors.js';
import { temporalDeVersion, versionDeClave } from './version.js';

export const COOKIE_CLIENTE = 'cavi_cliente';
export const DURACION_SESION_CLIENTE_S = 30 * 24 * 3600;

declare module 'fastify' {
  interface FastifyRequest {
    clienteJwtVerify<T>(opciones?: { onlyCookie: boolean }): Promise<T>;
  }
  interface FastifyReply {
    clienteJwtSign(payload: { sub: string; ver: string }, opciones: { expiresIn: number }): Promise<string>;
  }
}

const payloadSesion = z.object({ sub: z.string().uuid(), ver: z.string().min(1) });

export async function abrirSesionCliente(reply: FastifyReply, cliente: { id: string; ver: string }): Promise<void> {
  const token = await reply.clienteJwtSign({ sub: cliente.id, ver: cliente.ver }, { expiresIn: DURACION_SESION_CLIENTE_S });
  reply.setCookie(COOKIE_CLIENTE, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: DURACION_SESION_CLIENTE_S,
  });
}

export function cerrarSesionCliente(reply: FastifyReply): void {
  reply.clearCookie(COOKIE_CLIENTE, { path: '/', httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'lax' });
}

const SELECT_SESION = {
  id: true,
  correo: true,
  nombre: true,
  telefono: true,
  empresa: true,
  rtn: true,
  correoConfirmado: true,
  claveHash: true,
} as const;

export interface ClienteDeSesion {
  id: string;
  correo: string;
  nombre: string;
  telefono: string;
  empresa: string | null;
  rtn: string | null;
  /** Entró con una clave temporal y todavía no creó la propia. */
  debeCambiarClave: boolean;
  claveHash: string | null;
}

const uuid = z.string().uuid();

/** Cliente de la cookie, o null si no hay sesión válida (sin cookie, vencida, de otra clave, de una temporal que ya no vale o sin confirmar). */
export async function clienteOpcional(db: PrismaClient, req: FastifyRequest): Promise<ClienteDeSesion | null> {
  if (!req.cookies[COOKIE_CLIENTE]) return null;
  let crudo: unknown;
  try {
    crudo = await req.clienteJwtVerify<unknown>({ onlyCookie: true });
  } catch {
    return null;
  }
  const payload = payloadSesion.safeParse(crudo);
  if (!payload.success) return null;
  const cliente = await db.cliente.findUnique({ where: { id: payload.data.sub }, select: SELECT_SESION });
  if (!cliente || !cliente.correoConfirmado) return null;
  if (cliente.claveHash !== null) {
    if (versionDeClave(cliente.claveHash) !== payload.data.ver) return null;
    return { ...cliente, debeCambiarClave: false };
  }
  const tokenId = uuid.safeParse(temporalDeVersion(payload.data.ver));
  if (!tokenId.success) return null;
  const vigente = await db.tokenCliente.count({ where: { id: tokenId.data, clienteId: cliente.id, claveHash: { not: null }, venceEn: { gt: new Date() } } });
  if (vigente !== 1) return null;
  return { ...cliente, debeCambiarClave: true };
}

/** Sesión obligatoria. Con clave temporal solo se permite lo que sirve para crear la clave propia. */
export async function requiereCliente(
  db: PrismaClient,
  req: FastifyRequest,
  opciones: { permitirClaveTemporal?: boolean } = {},
): Promise<ClienteDeSesion> {
  const cliente = await clienteOpcional(db, req);
  if (!cliente) throw new UnauthorizedError();
  if (cliente.debeCambiarClave && !opciones.permitirClaveTemporal) {
    throw new ForbiddenError('debe_cambiar_clave', 'Crea tu clave propia para continuar.');
  }
  return cliente;
}
