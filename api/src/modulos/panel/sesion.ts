import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient, RolUsuario } from '@prisma/client';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors.js';
import { versionDeClave } from '../clientes/version.js';

export const COOKIE_PANEL = 'cavi_panel';
export const DURACION_SESION_PANEL_S = 7 * 24 * 3600;
// La cookie solo viaja a la API del panel: el sitio público y el portal nunca la reciben.
const RUTA_COOKIE = '/api/panel';

declare module 'fastify' {
  interface FastifyRequest {
    panelJwtVerify<T>(opciones?: { onlyCookie: boolean }): Promise<T>;
  }
  interface FastifyReply {
    panelJwtSign(payload: { sub: string; ver: string }, opciones: { expiresIn: number }): Promise<string>;
  }
}

const payloadSesion = z.object({ sub: z.string().uuid(), ver: z.string().min(1) });

const opcionesCookie = () => ({ httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'strict' as const, path: RUTA_COOKIE });

export async function abrirSesionPanel(reply: FastifyReply, usuario: { id: string; claveHash: string }): Promise<void> {
  const token = await reply.panelJwtSign({ sub: usuario.id, ver: versionDeClave(usuario.claveHash) }, { expiresIn: DURACION_SESION_PANEL_S });
  reply.setCookie(COOKIE_PANEL, token, { ...opcionesCookie(), maxAge: DURACION_SESION_PANEL_S });
}

export function cerrarSesionPanel(reply: FastifyReply): void {
  reply.clearCookie(COOKIE_PANEL, opcionesCookie());
}

export const SELECT_USUARIO = {
  id: true,
  nombre: true,
  correo: true,
  rol: true,
  activo: true,
  debeCambiarClave: true,
} as const;

export interface UsuarioDeSesion {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  activo: boolean;
  debeCambiarClave: boolean;
  claveHash: string;
}

export const usuarioPublico = (u: Omit<UsuarioDeSesion, 'claveHash'>) => ({
  id: u.id,
  nombre: u.nombre,
  correo: u.correo,
  rol: u.rol,
  activo: u.activo,
  debeCambiarClave: u.debeCambiarClave,
});

/**
 * Usuario del panel de la cookie. Se lee de la base en cada pedido: desactivarlo, cambiarle
 * el rol o la clave corta su sesión en el acto.
 */
export async function requierePanel(
  db: PrismaClient,
  req: FastifyRequest,
  opciones: { permitirClaveTemporal?: boolean; soloAdmin?: boolean } = {},
): Promise<UsuarioDeSesion> {
  if (!req.cookies[COOKIE_PANEL]) throw new UnauthorizedError();
  let crudo: unknown;
  try {
    crudo = await req.panelJwtVerify<unknown>({ onlyCookie: true });
  } catch {
    throw new UnauthorizedError();
  }
  const payload = payloadSesion.safeParse(crudo);
  if (!payload.success) throw new UnauthorizedError();
  const usuario = await db.usuario.findUnique({ where: { id: payload.data.sub }, select: { ...SELECT_USUARIO, claveHash: true } });
  if (!usuario || !usuario.activo || versionDeClave(usuario.claveHash) !== payload.data.ver) throw new UnauthorizedError();
  if (usuario.debeCambiarClave && !opciones.permitirClaveTemporal) {
    throw new ForbiddenError('debe_cambiar_clave', 'Crea tu clave propia para continuar.');
  }
  if (opciones.soloAdmin && usuario.rol !== 'admin') throw new ForbiddenError('solo_admin', 'Solo un administrador puede hacer esto.');
  return usuario;
}
