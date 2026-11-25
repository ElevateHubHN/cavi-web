import type { EstadoCorreo, Prisma, PrismaClient, TipoCorreo } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { z } from 'zod';
import { env } from '../config/env.js';
import type { Contenido, ContextoCorreo } from './plantillas.js';
import { cifrar, descifrar } from './sobre.js';
import type { Transporte } from './transporte.js';

export const TIPOS_DE_CUENTA: readonly TipoCorreo[] = ['confirmacion', 'clave_temporal'];
export const MAX_CORREOS_DE_CUENTA_POR_HORA = 3;
export const MOTIVO_TOPE_GLOBAL = 'Se alcanzó el tope de correos por hora';
export const MOTIVO_SIN_ENVIAR = 'No se llegó a enviar: la API se reinició antes de terminar';
export const MOTIVO_ILEGIBLE = 'No se pudo recuperar el correo guardado: cambió la llave de la API';
export const MOTIVO_TOPE_DIRECCION = 'Tope de correos por hora para esta dirección';
/** Un correo pendiente que lleva más de esto sin resolverse ya no está en camino: se puede reenviar. */
export const PENDIENTE_VENCE_MS = 5 * 60_000;
const UNA_HORA_MS = 3_600_000;
/** Lo que gasta los topes (global, por dirección y por cotización): lo que salió o está saliendo, nunca lo que falló. */
export const CUENTAN_PARA_EL_TOPE: readonly EstadoCorreo[] = ['enviado', 'pendiente'];
const LOTE_PENDIENTES = 50;

/** Pendiente que ya no está en camino: se cuenta desde que alguien lo tomó para mandarlo o, si nadie lo tomó, desde que se anotó. */
export const pendienteVencido = (m: { estado: EstadoCorreo; creadoEn: Date; tomadoEn: Date | null }, ahora = Date.now()): boolean =>
  m.estado === 'pendiente' && ahora - (m.tomadoEn ?? m.creadoEn).getTime() > PENDIENTE_VENCE_MS;

/** Lo que el reenvío puede reemplazar, como condición del UPDATE: la misma regla que `pendienteVencido`, más los fallidos. */
function noSalio(ahora: Date): Prisma.CorreoWhereInput {
  const limite = new Date(ahora.getTime() - PENDIENTE_VENCE_MS);
  return { OR: [{ estado: 'fallido' }, { estado: 'pendiente', tomadoEn: { lt: limite } }, { estado: 'pendiente', tomadoEn: null, creadoEn: { lt: limite } }] };
}

/**
 * Candado de la bitácora de correos. Toda transacción que cuenta el tope global o cambia más de
 * un correo lo toma primero, para que se ejecuten en orden y no se crucen.
 */
export async function candadoDelTope(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('correo-tope-global'))`;
}

/**
 * Deja reemplazado un correo que no salió, para anotar otro en su lugar. Devuelve false si ya
 * no está en ese caso (otro lo tomó para mandarlo, o ya se resolvió): entonces no se reenvía.
 * Se llama con `candadoDelTope` tomado.
 */
export async function reemplazarCorreo(tx: Prisma.TransactionClient, id: string, ahora = new Date()): Promise<boolean> {
  const r = await tx.correo.updateMany({ where: { id, ...noSalio(ahora) }, data: { estado: 'reemplazado', contenido: null } });
  return r.count === 1;
}

/** Pendiente que nadie está enviando: sin tomar, o tomado antes de `arranque` por un proceso que ya no corre (la API tiene una sola instancia). */
const sinDueno = (arranque?: Date): Prisma.CorreoWhereInput => ({
  estado: 'pendiente',
  ...(arranque ? { OR: [{ tomadoEn: null }, { tomadoEn: { lt: arranque } }] } : { tomadoEn: null }),
});

/** Único paso que da derecho a enviar un correo: solo un proceso lo logra, y nunca sobre uno reemplazado o resuelto. */
async function tomarCorreo(db: PrismaClient, id: string, arranque?: Date): Promise<boolean> {
  const r = await db.correo.updateMany({ where: { id, ...sinDueno(arranque) }, data: { tomadoEn: new Date() } });
  return r.count === 1;
}

export interface Envio {
  tipo: TipoCorreo;
  para: string;
  contenido: Contenido;
  cotizacionId?: string | null;
  responderA?: string;
}

export interface Anotado {
  id: string;
  estado: Extract<EstadoCorreo, 'pendiente' | 'fallido'>;
}

/** La respuesta HTTP en curso: los correos salen cuando termina. */
export interface Salida {
  raw: { writableFinished: boolean; destroyed: boolean; once(evento: 'finish' | 'close', fn: () => void): unknown };
}

export interface Correos {
  readonly avisos: string;
  readonly ctx: ContextoCorreo;
  /** Anota el correo y lo manda cuando termina la respuesta. Nunca lanza: si algo falla queda «fallido» en la bitácora. */
  enviar(salida: Salida, envio: Envio): Promise<EstadoCorreo>;
  /** Manda, cuando termina la respuesta, un correo ya anotado. Uno que quedó fallido por el tope no se intenta. */
  programar(salida: Salida, anotado: Anotado, envio: Envio): EstadoCorreo;
}

const enCurso = new Set<Promise<void>>();

/** Espera a que terminen los envíos en curso. Lo usan el cierre de la API y las pruebas. */
export async function vaciarEnvios(): Promise<void> {
  while (enCurso.size > 0) await Promise.allSettled([...enCurso]);
}

/**
 * Anota un correo como pendiente. Si ya se llegó al tope global de la última hora (enviados y
 * pendientes de todos los tipos), queda fallido con el motivo y se puede reenviar después.
 * El candado evita que dos pedidos simultáneos superen juntos el tope.
 */
export async function anotarCorreo(
  tx: Prisma.TransactionClient,
  datos: { tipo: TipoCorreo; para: string; cotizacionId?: string | null },
  ahora = new Date(),
): Promise<Anotado> {
  await candadoDelTope(tx);
  const usados = await tx.correo.count({
    where: { estado: { in: [...CUENTAN_PARA_EL_TOPE] }, creadoEn: { gt: new Date(ahora.getTime() - UNA_HORA_MS) } },
  });
  const lleno = usados >= env.CORREO_TOPE_HORA;
  // El nuevo reemplaza a los anteriores del mismo tipo y cotización que no salieron.
  if (!lleno && datos.cotizacionId) {
    await tx.correo.updateMany({ where: { cotizacionId: datos.cotizacionId, tipo: datos.tipo, ...noSalio(ahora) }, data: { estado: 'reemplazado', contenido: null } });
  }
  const fila = await tx.correo.create({
    data: {
      tipo: datos.tipo,
      para: datos.para,
      cotizacionId: datos.cotizacionId ?? null,
      estado: lleno ? 'fallido' : 'pendiente',
      error: lleno ? MOTIVO_TOPE_GLOBAL : null,
    },
    select: { id: true },
  });
  return { id: fila.id, estado: lleno ? 'fallido' : 'pendiente' };
}

const describir = (e: unknown): string => (e instanceof Error ? e.message : String(e)).slice(0, 500);

async function intentar(transporte: Transporte, log: FastifyBaseLogger, envio: Envio): Promise<string | null> {
  try {
    await transporte.enviar({
      para: envio.para,
      asunto: envio.contenido.asunto,
      html: envio.contenido.html,
      texto: envio.contenido.texto,
      responderA: envio.responderA,
      ...(envio.contenido.nombreRemitente ? { nombreRemitente: envio.contenido.nombreRemitente } : {}),
    });
    return null;
  } catch (e) {
    const error = describir(e);
    log.error({ tipo: envio.tipo, cotizacionId: envio.cotizacionId ?? null, error }, 'no se pudo enviar un correo');
    return error;
  }
}

/** Manda un correo anotado, si logra tomarlo, y deja su resultado. Null si no era suyo para mandar. */
async function entregar(db: PrismaClient, transporte: Transporte, log: FastifyBaseLogger, id: string, envio: Envio, arranque?: Date): Promise<EstadoCorreo | null> {
  if (!(await tomarCorreo(db, id, arranque))) return null;
  const error = await intentar(transporte, log, envio);
  try {
    await db.correo.updateMany({
      where: { id, estado: 'pendiente' },
      data: error ? { estado: 'fallido', error, contenido: null } : { estado: 'enviado', contenido: null },
    });
  } catch (e) {
    log.error({ tipo: envio.tipo, error: describir(e) }, 'no se pudo anotar el resultado de un correo');
  }
  return error ? 'fallido' : 'enviado';
}

function enSegundoPlano(trabajo: () => Promise<unknown>): void {
  const promesa = trabajo().then(
    () => undefined,
    () => undefined,
  );
  enCurso.add(promesa);
  void promesa.then(() => enCurso.delete(promesa));
}

const sobreDeEnvio = z.object({
  tipo: z.string(),
  para: z.string(),
  cotizacionId: z.string().nullable().optional(),
  responderA: z.string().optional(),
  contenido: z.object({ asunto: z.string(), html: z.string(), texto: z.string(), paraCavi: z.boolean(), nombreRemitente: z.string().nullable() }),
});

function abrirSobre(sobre: string, tipo: TipoCorreo): Envio | null {
  const leido = sobreDeEnvio.safeParse(descifrar(sobre));
  if (!leido.success) return null;
  const { responderA, ...resto } = leido.data;
  return { ...resto, tipo, ...(responderA ? { responderA } : {}) };
}

/**
 * Al arrancar, toma los correos que quedaron pendientes (la API se cortó antes o durante el envío)
 * y los intenta una vez, uno por uno y sin pasar el tope global. El que no sale queda fallido con
 * su motivo y se reenvía desde el panel. No toca los anotados después de `arranque`.
 */
export async function reintentarPendientes(
  db: PrismaClient,
  transporte: Transporte,
  log: FastifyBaseLogger,
  arranque: Date,
): Promise<{ enviados: number; fallidos: number }> {
  const cuenta = { enviados: 0, fallidos: 0 };
  // Los que salen ahora pero se anotaron hace más de una hora no entran en el conteo de la última hora: se suman aparte.
  let viejosEnviados = 0;
  // Cada correo procesado queda tomado o fallido y ya no cumple el filtro: la consulta siguiente trae otros.
  for (;;) {
    const lote = await db.correo.findMany({
      where: { ...sinDueno(arranque), creadoEn: { lt: arranque } },
      orderBy: [{ creadoEn: 'asc' }, { id: 'asc' }],
      take: LOTE_PENDIENTES,
      select: { id: true, tipo: true, creadoEn: true, contenido: true },
    });
    for (const fila of lote) {
      const ahora = new Date();
      const envio = fila.contenido ? abrirSobre(fila.contenido, fila.tipo) : null;
      let motivo: string | null = envio ? null : fila.contenido ? MOTIVO_ILEGIBLE : MOTIVO_SIN_ENVIAR;
      if (envio) {
        const usados = await db.correo.count({
          where: { id: { not: fila.id }, estado: { in: [...CUENTAN_PARA_EL_TOPE] }, creadoEn: { gt: new Date(ahora.getTime() - UNA_HORA_MS) } },
        });
        if (usados + viejosEnviados >= env.CORREO_TOPE_HORA) motivo = MOTIVO_TOPE_GLOBAL;
      }
      if (motivo || !envio) {
        const r = await db.correo.updateMany({ where: { id: fila.id, ...sinDueno(arranque) }, data: { estado: 'fallido', error: motivo, contenido: null } });
        cuenta.fallidos += r.count;
        continue;
      }
      const estado = await entregar(db, transporte, log, fila.id, envio, arranque);
      if (estado === 'enviado') {
        cuenta.enviados++;
        if (ahora.getTime() - fila.creadoEn.getTime() >= UNA_HORA_MS) viejosEnviados++;
      } else if (estado === 'fallido') {
        cuenta.fallidos++;
      }
    }
    if (lote.length < LOTE_PENDIENTES) return cuenta;
  }
}

/** Corre `reintentarPendientes` sin frenar el arranque; el cierre de la API lo espera como a los demás envíos. */
export function reintentarPendientesAlArrancar(db: PrismaClient, transporte: Transporte, log: FastifyBaseLogger, arranque: Date): void {
  enSegundoPlano(async () => {
    try {
      const r = await reintentarPendientes(db, transporte, log, arranque);
      if (r.enviados + r.fallidos > 0) log.warn(r, 'correos que quedaron pendientes de antes: reintentados');
    } catch (e) {
      log.error({ error: describir(e) }, 'no se pudieron reintentar los correos pendientes');
    }
  });
}

export function crearCorreos(db: PrismaClient, transporte: Transporte, opciones: { avisos: string; ctx: ContextoCorreo; log: FastifyBaseLogger }): Correos {
  function programar(salida: Salida, anotado: Anotado, envio: Envio): EstadoCorreo {
    if (anotado.estado !== 'pendiente') return anotado.estado;
    // Queda guardado mientras está pendiente: si la API se corta antes de mandarlo, se reintenta al arrancar.
    const guardado = db.correo
      .updateMany({ where: { id: anotado.id, estado: 'pendiente' }, data: { contenido: cifrar(envio) } })
      .catch((e: unknown) => opciones.log.error({ tipo: envio.tipo, error: describir(e) }, 'no se pudo guardar un correo pendiente'));
    let salir: () => void = () => undefined;
    const respuestaTerminada = new Promise<void>((r) => {
      salir = r;
    });
    if (salida.raw.writableFinished || salida.raw.destroyed) {
      salir();
    } else {
      salida.raw.once('finish', salir);
      salida.raw.once('close', salir);
    }
    enSegundoPlano(async () => {
      await Promise.all([guardado, respuestaTerminada]);
      await entregar(db, transporte, opciones.log, anotado.id, envio);
    });
    return 'pendiente';
  }

  return {
    avisos: opciones.avisos,
    ctx: opciones.ctx,
    async enviar(salida, envio) {
      let anotado: Anotado;
      try {
        anotado = await db.$transaction((tx) => anotarCorreo(tx, { tipo: envio.tipo, para: envio.para, cotizacionId: envio.cotizacionId ?? null }));
      } catch (e) {
        opciones.log.error({ tipo: envio.tipo, error: describir(e) }, 'no se pudo anotar un correo en la bitácora');
        return 'fallido';
      }
      return programar(salida, anotado, envio);
    },
    programar,
  };
}

/**
 * Tope de correos de cuenta (confirmación o clave temporal) por dirección y por hora.
 * Se llama dentro de la transacción que decide el envío, con el candado del correo tomado,
 * para que dos pedidos simultáneos no superen juntos el tope. Devuelve el correo anotado, o
 * null si ya no quedan envíos (y registra el omitido). Si quedó fallido por el tope global,
 * quien llama no debe emitir credenciales nuevas.
 */
export async function reservarCorreoDeCuenta(
  tx: Prisma.TransactionClient,
  datos: { tipo: TipoCorreo; para: string; cotizacionId?: string | null },
  ahora = new Date(),
): Promise<Anotado | null> {
  const usados = await tx.correo.count({
    where: {
      para: datos.para,
      tipo: { in: [...TIPOS_DE_CUENTA] },
      estado: { in: [...CUENTAN_PARA_EL_TOPE] },
      creadoEn: { gt: new Date(ahora.getTime() - UNA_HORA_MS) },
    },
  });
  if (usados >= MAX_CORREOS_DE_CUENTA_POR_HORA) {
    await tx.correo.create({
      data: { tipo: datos.tipo, para: datos.para, cotizacionId: datos.cotizacionId ?? null, estado: 'omitido', error: MOTIVO_TOPE_DIRECCION },
    });
    return null;
  }
  return anotarCorreo(tx, datos, ahora);
}

export async function candadoDeCorreo(tx: Prisma.TransactionClient, correo: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${correo}))`;
}
