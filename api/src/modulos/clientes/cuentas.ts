import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Prisma, PrismaClient } from '@prisma/client';
import { env } from '../../config/env.js';
import { AppError, ForbiddenError, UnauthorizedError } from '../../shared/errors.js';
import { candadoDeCorreo, reservarCorreoDeCuenta, type Anotado, type Correos, type Salida } from '../../correos/correos.js';
import { claveTemporal as plantillaClaveTemporal, confirmacion as plantillaConfirmacion } from '../../correos/plantillas.js';
import { versionDeClave, versionTemporal } from './version.js';

export const MIN_LARGO_CLAVE = 8;
export const VIGENCIA_CONFIRMACION_MS = 24 * 3600 * 1000;
export const VIGENCIA_CLAVE_TEMPORAL_MS = 24 * 3600 * 1000;
/** Claves temporales que pueden valer a la vez en una cuenta; una nueva deja sin efecto la más vieja. */
export const MAX_CLAVES_TEMPORALES = 3;

const ALFABETO_CLAVE_TEMPORAL = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const LARGO_CLAVE_TEMPORAL = 10;

export const normalizarCorreo = (correo: string): string => correo.trim().toLowerCase();

export function generarClaveTemporal(): string {
  let clave = '';
  for (let i = 0; i < LARGO_CLAVE_TEMPORAL; i++) clave += ALFABETO_CLAVE_TEMPORAL[randomInt(ALFABETO_CLAVE_TEMPORAL.length)];
  return clave;
}

export const generarToken = (): string => randomBytes(32).toString('hex');
export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');
export const hashClave = (clave: string): Promise<string> => bcrypt.hash(clave, env.BCRYPT_COSTO);

/**
 * Huella de una clave temporal (10 caracteres al azar, vence a las 24 horas). Basta un HMAC con
 * una llave que no está en la base, y así el ingreso la busca sin un bcrypt por cada clave vigente.
 */
const LLAVE_CLAVES_TEMPORALES = createHmac('sha256', env.JWT_SECRET).update('clave-temporal-cliente').digest();
export const huellaClaveTemporal = (clave: string): string => createHmac('sha256', LLAVE_CLAVES_TEMPORALES).update(clave).digest('hex');

// Comparar contra un hash fijo cuando el correo no existe: el tiempo de respuesta no revela qué correos tienen cuenta.
export const HASH_FALSO = bcrypt.hashSync('nadie-tiene-esta-clave', env.BCRYPT_COSTO);

export const enlaceConfirmacion = (base: string, token: string) => `${base}/portal/confirmar?token=${encodeURIComponent(token)}`;

export interface Credenciales {
  token: string;
  claveTemporal: string;
}

export const nuevasCredenciales = (): Credenciales => ({ token: generarToken(), claveTemporal: generarClaveTemporal() });

/** Deja como mucho MAX_CLAVES_TEMPORALES vigentes: las más viejas pierden su clave. */
async function recortarClavesTemporales(tx: Prisma.TransactionClient, clienteId: string, ahora: Date): Promise<void> {
  const sobran = await tx.tokenCliente.findMany({
    where: { clienteId, claveHash: { not: null }, venceEn: { gt: ahora } },
    orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
    skip: MAX_CLAVES_TEMPORALES,
    select: { id: true },
  });
  if (sobran.length > 0) await tx.tokenCliente.updateMany({ where: { id: { in: sobran.map((t) => t.id) } }, data: { claveHash: null } });
}

/** Anula las claves temporales de la cuenta, salvo la que se indique. */
const anularClavesTemporales = (tx: Prisma.TransactionClient, clienteId: string, salvo?: string) =>
  tx.tokenCliente.updateMany({ where: { clienteId, claveHash: { not: null }, ...(salvo ? { id: { not: salvo } } : {}) }, data: { claveHash: null } });

const temporalVigente = (clienteId: string, clave: string, ahora: Date): Prisma.TokenClienteWhereInput => ({
  clienteId,
  claveHash: huellaClaveTemporal(clave),
  venceEn: { gt: ahora },
});

/**
 * Enlace de confirmación nuevo con su clave temporal, sin anular los anteriores vigentes: cada
 * uno vence a las 24 horas. Así una solicitud de otra persona con ese correo no deja sin acceso
 * al dueño. Se llama con el candado del correo de la cuenta tomado.
 */
export async function emitirConfirmacion(tx: Prisma.TransactionClient, clienteId: string, credenciales: Credenciales): Promise<void> {
  const ahora = new Date();
  await tx.tokenCliente.create({
    data: {
      clienteId,
      tipo: 'confirmar',
      tokenHash: hashToken(credenciales.token),
      claveHash: huellaClaveTemporal(credenciales.claveTemporal),
      venceEn: new Date(ahora.getTime() + VIGENCIA_CONFIRMACION_MS),
    },
  });
  await recortarClavesTemporales(tx, clienteId, ahora);
}

export interface ConfirmacionPendiente {
  anotado: Anotado;
  para: string;
  nombre: string;
  credenciales: Credenciales;
  numero: string | null;
  cotizacionId: string | null;
}

export function enviarConfirmacion(correos: Correos, salida: Salida, p: ConfirmacionPendiente) {
  return correos.programar(salida, p.anotado, {
    tipo: 'confirmacion',
    para: p.para,
    cotizacionId: p.cotizacionId,
    contenido: plantillaConfirmacion(correos.ctx, {
      nombre: p.nombre,
      enlace: enlaceConfirmacion(correos.ctx.sitio, p.credenciales.token),
      claveTemporal: p.credenciales.claveTemporal,
      numero: p.numero,
    }),
  });
}

export async function confirmarCorreo(db: PrismaClient, token: string): Promise<void> {
  const invalido = () => new AppError('enlace_no_valido', 'Este enlace no es válido o ya venció. Pide uno nuevo desde el ingreso a tu portal.', 400);
  if (!/^[0-9a-f]{64}$/.test(token)) throw invalido();
  const ahora = new Date();
  await db.$transaction(async (tx) => {
    const fila = await tx.tokenCliente.findUnique({ where: { tokenHash: hashToken(token) }, select: { id: true, clienteId: true, tipo: true, usadoEn: true, venceEn: true } });
    if (!fila || fila.tipo !== 'confirmar' || fila.usadoEn || fila.venceEn <= ahora) throw invalido();
    const usado = await tx.tokenCliente.updateMany({ where: { id: fila.id, usadoEn: null }, data: { usadoEn: ahora } });
    if (usado.count !== 1) throw invalido();
    await tx.cliente.update({ where: { id: fila.clienteId }, data: { correoConfirmado: true } });
  });
}

/** Siempre responde igual al que pregunta: no revela si el correo tiene cuenta ni si llegó al tope. */
export async function reenviarConfirmacion(db: PrismaClient, correos: Correos, salida: Salida, correoCrudo: string): Promise<void> {
  const para = normalizarCorreo(correoCrudo);
  const cliente = await db.cliente.findUnique({ where: { correo: para }, select: { id: true, nombre: true, correoConfirmado: true } });
  if (!cliente || cliente.correoConfirmado) return;
  const credenciales = nuevasCredenciales();
  const anotado = await db.$transaction(async (tx) => {
    await candadoDeCorreo(tx, para);
    const a = await reservarCorreoDeCuenta(tx, { tipo: 'confirmacion', para });
    if (a?.estado === 'pendiente') await emitirConfirmacion(tx, cliente.id, credenciales);
    return a;
  });
  if (anotado) enviarConfirmacion(correos, salida, { anotado, para, nombre: cliente.nombre, credenciales, numero: null, cotizacionId: null });
}

/**
 * Clave temporal nueva que convive con la propia y con las otras temporales durante 24 horas:
 * si el pedido no lo hizo el dueño, su clave sigue funcionando. Si el correo no está
 * confirmado, manda otra vez la confirmación.
 */
export async function olvideClave(db: PrismaClient, correos: Correos, salida: Salida, correoCrudo: string): Promise<void> {
  const para = normalizarCorreo(correoCrudo);
  const cliente = await db.cliente.findUnique({ where: { correo: para }, select: { id: true, nombre: true, correoConfirmado: true } });
  if (!cliente) return;
  if (!cliente.correoConfirmado) return reenviarConfirmacion(db, correos, salida, para);
  const claveTemporal = generarClaveTemporal();
  const anotado = await db.$transaction(async (tx) => {
    await candadoDeCorreo(tx, para);
    const a = await reservarCorreoDeCuenta(tx, { tipo: 'clave_temporal', para });
    if (a?.estado === 'pendiente') {
      const ahora = new Date();
      await tx.tokenCliente.create({
        data: {
          clienteId: cliente.id,
          tipo: 'clave_temporal',
          tokenHash: hashToken(generarToken()),
          claveHash: huellaClaveTemporal(claveTemporal),
          venceEn: new Date(ahora.getTime() + VIGENCIA_CLAVE_TEMPORAL_MS),
        },
      });
      await recortarClavesTemporales(tx, cliente.id, ahora);
    }
    return a;
  });
  if (!anotado) return;
  correos.programar(salida, anotado, {
    tipo: 'clave_temporal',
    para,
    contenido: plantillaClaveTemporal(correos.ctx, { nombre: cliente.nombre, claveTemporal }),
  });
}

export interface Ingreso {
  id: string;
  /** Con qué quedó atada la sesión: la clave propia o la temporal usada. */
  ver: string;
  debeCambiarClave: boolean;
}

/**
 * Un bcrypt por intento, exista o no la cuenta y tenga o no clave propia (el tiempo no revela
 * qué correos están registrados); las claves temporales se buscan por su huella.
 * Lo que cambia la cuenta va con el candado de su correo: dos ingresos simultáneos se ejecutan en orden.
 */
export async function ingresar(db: PrismaClient, correoCrudo: string, clave: string, ahora = new Date()): Promise<Ingreso> {
  const correo = normalizarCorreo(correoCrudo);
  const cliente = await db.cliente.findUnique({ where: { correo }, select: { id: true, claveHash: true, correoConfirmado: true } });
  const incorrectas = () => new UnauthorizedError('Correo o clave incorrectos.');
  const propia = cliente?.claveHash ?? null;
  const coincide = await bcrypt.compare(clave, propia ?? HASH_FALSO);
  if (!cliente) throw incorrectas();
  const conLaSuya = propia !== null && coincide;
  const temporal = conLaSuya ? null : await db.tokenCliente.findFirst({ where: temporalVigente(cliente.id, clave, ahora), select: { id: true } });
  if (!conLaSuya && !temporal) throw incorrectas();
  if (!cliente.correoConfirmado) {
    throw new ForbiddenError('correo_sin_confirmar', 'Confirma tu correo con el enlace que te enviamos antes de ingresar.');
  }
  return db.$transaction(async (tx) => {
    await candadoDeCorreo(tx, correo);
    if (temporal) {
      // Si otro ingreso entró antes, esta temporal ya no vale.
      if ((await tx.tokenCliente.count({ where: { id: temporal.id, ...temporalVigente(cliente.id, clave, ahora) } })) !== 1) throw incorrectas();
      await anularClavesTemporales(tx, cliente.id, temporal.id);
      await tx.cliente.update({ where: { id: cliente.id }, data: { claveHash: null }, select: { id: true } });
      return { id: cliente.id, ver: versionTemporal(temporal.id), debeCambiarClave: true };
    }
    // Entró el dueño con su clave, si sigue siendo la misma: las temporales que pidió otro dejan de servir.
    if (propia === null || (await tx.cliente.count({ where: { id: cliente.id, claveHash: propia } })) !== 1) throw incorrectas();
    await anularClavesTemporales(tx, cliente.id);
    return { id: cliente.id, ver: versionDeClave(propia), debeCambiarClave: false };
  });
}

export async function cambiarClave(
  db: PrismaClient,
  cliente: { id: string; correo: string; claveHash: string | null },
  datos: { actual?: string | undefined; nueva: string },
): Promise<{ id: string; ver: string }> {
  if (datos.nueva.length < MIN_LARGO_CLAVE) {
    throw new AppError('clave_corta', `La clave debe tener al menos ${MIN_LARGO_CLAVE} caracteres.`, 400);
  }
  if (cliente.claveHash === null) {
    if ((await db.tokenCliente.count({ where: temporalVigente(cliente.id, datos.nueva, new Date()) })) > 0) {
      throw new AppError('clave_repetida', 'La clave nueva no puede ser igual a la clave temporal.', 400);
    }
  } else {
    if (!datos.actual || !(await bcrypt.compare(datos.actual, cliente.claveHash))) {
      throw new AppError('clave_actual_incorrecta', 'La clave actual no es correcta.', 400);
    }
    if (datos.actual === datos.nueva) throw new AppError('clave_repetida', 'La clave nueva debe ser distinta de la actual.', 400);
  }
  const claveHash = await hashClave(datos.nueva);
  await db.$transaction(async (tx) => {
    await candadoDeCorreo(tx, cliente.correo);
    // Solo sobre la clave con la que se comprobó el pedido: si cambió mientras tanto, la sesión ya no vale.
    const cambiada = await tx.cliente.updateMany({ where: { id: cliente.id, claveHash: cliente.claveHash }, data: { claveHash } });
    if (cambiada.count !== 1) throw new UnauthorizedError();
    await anularClavesTemporales(tx, cliente.id);
  });
  return { id: cliente.id, ver: versionDeClave(claveHash) };
}
