import { readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { ESTADOS_FOTO_SE_BORRA, quitarFotoPorAntiguedad } from '../../dominio/cotizaciones.js';

const LOTE = 100;
const UN_DIA_MS = 24 * 3600 * 1000;
/** Lo que deja `guardarFoto`: la foto final o el parcial de una subida que se cortó. */
const NOMBRE_DE_FOTO = /^[0-9a-f-]{36}\.(jpg|png|webp|parcial)$/;

export interface ResultadoLimpieza {
  fotosViejas: number;
  huerfanas: number;
}

async function borrarArchivo(dir: string, archivo: string): Promise<void> {
  await rm(join(dir, archivo), { force: true });
}

/**
 * Borra las fotos de cotizaciones entregadas o canceladas sin movimientos en `retencionDias`, y los
 * archivos de la carpeta que ninguna cotización usa y tienen más de un día. Va en lotes de 100 y
 * tolera que un archivo ya no esté. El dato se quita antes que el archivo: si algo se corta en el
 * medio, el archivo queda huérfano y lo borra la pasada siguiente.
 */
export async function limpiarFotos(db: PrismaClient, dir: string, opciones: { retencionDias: number; ahora?: Date }): Promise<ResultadoLimpieza> {
  const ahora = opciones.ahora ?? new Date();
  const limite = new Date(ahora.getTime() - opciones.retencionDias * UN_DIA_MS);
  let fotosViejas = 0;
  let desdeNumero = 0;
  for (;;) {
    const lote = await db.cotizacion.findMany({
      where: {
        numero: { gt: desdeNumero },
        estado: { in: [...ESTADOS_FOTO_SE_BORRA] },
        fotoArchivo: { not: null },
        creadaEn: { lt: limite },
        cambios: { none: { creadoEn: { gte: limite } } },
      },
      orderBy: { numero: 'asc' },
      take: LOTE,
      select: { numero: true },
    });
    for (const { numero } of lote) {
      const archivo = await quitarFotoPorAntiguedad(db, { numero, limite });
      if (archivo && NOMBRE_DE_FOTO.test(archivo)) {
        await borrarArchivo(dir, archivo);
        fotosViejas++;
      }
    }
    const ultimo = lote.at(-1);
    if (!ultimo || lote.length < LOTE) break;
    desdeNumero = ultimo.numero;
  }

  let huerfanas = 0;
  let nombres: string[];
  try {
    nombres = (await readdir(dir)).filter((n) => NOMBRE_DE_FOTO.test(n));
  } catch (e) {
    if (e instanceof Error && 'code' in e && e.code === 'ENOENT') return { fotosViejas, huerfanas };
    throw e;
  }
  for (let i = 0; i < nombres.length; i += LOTE) {
    const lote = nombres.slice(i, i + LOTE);
    const usadas = new Set(
      (await db.cotizacion.findMany({ where: { fotoArchivo: { in: lote } }, select: { fotoArchivo: true } })).map((c) => c.fotoArchivo),
    );
    for (const nombre of lote) {
      if (usadas.has(nombre)) continue;
      const info = await stat(join(dir, nombre)).catch(() => null);
      if (!info?.isFile() || ahora.getTime() - info.mtimeMs < UN_DIA_MS) continue;
      await borrarArchivo(dir, nombre);
      huerfanas++;
    }
  }
  return { fotosViejas, huerfanas };
}

/** Corre al arrancar y una vez por día, en el mismo proceso. Devuelve con qué detenerla. */
export function programarLimpiezaFotos(db: PrismaClient, dir: string, opciones: { retencionDias: number; log: FastifyBaseLogger }): () => void {
  let corriendo = false;
  const correr = async () => {
    if (corriendo) return;
    corriendo = true;
    try {
      const r = await limpiarFotos(db, dir, { retencionDias: opciones.retencionDias });
      if (r.fotosViejas || r.huerfanas) opciones.log.info(r, 'fotos viejas borradas');
    } catch (e) {
      opciones.log.error({ err: e }, 'no se pudo limpiar las fotos viejas');
    } finally {
      corriendo = false;
    }
  };
  void correr();
  const reloj = setInterval(() => void correr(), UN_DIA_MS);
  reloj.unref();
  return () => clearInterval(reloj);
}
