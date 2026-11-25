import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { MultipartFile } from '@fastify/multipart';
import { AppError } from '../../shared/errors.js';

export const MAX_BYTES_FOTO = 5 * 1024 * 1024;
/** Una imagen real nunca pesa menos: lo que trae solo la firma no es una foto. */
export const MIN_BYTES_FOTO = 100;

export type TipoImagen = 'jpg' | 'png' | 'webp';

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function tipoDeImagen(cabecera: Buffer): TipoImagen | null {
  if (cabecera.length >= 3 && cabecera[0] === 0xff && cabecera[1] === 0xd8 && cabecera[2] === 0xff) return 'jpg';
  if (cabecera.length >= 8 && PNG.every((b, i) => cabecera[i] === b)) return 'png';
  if (cabecera.length >= 12 && cabecera.toString('latin1', 0, 4) === 'RIFF' && cabecera.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  return null;
}

export const fotoInvalida = () => new AppError('foto_invalida', 'La foto debe ser una imagen JPG, PNG o WebP.', 400);
export const fotoMuyGrande = () => new AppError('foto_muy_grande', 'La foto pesa más de 5 MB.', 413);

export interface FotoGuardada {
  archivo: string;
  ruta: string;
}

/** Guarda la foto comprobando sus primeros bytes; si no es una imagen admitida o se pasa del tope, no queda nada en disco. */
export async function guardarFoto(parte: MultipartFile, dir: string): Promise<FotoGuardada> {
  await mkdir(dir, { recursive: true });
  const id = randomUUID();
  const parcial = join(dir, `${id}.parcial`);
  let cabecera = Buffer.alloc(0);
  let bytes = 0;
  const hallado: { tipo: TipoImagen | null } = { tipo: null };
  const comprobar = new Transform({
    transform(trozo: Buffer, _codificacion, listo) {
      bytes += trozo.length;
      if (hallado.tipo === null) {
        cabecera = Buffer.concat([cabecera, trozo]);
        if (cabecera.length >= 12) {
          hallado.tipo = tipoDeImagen(cabecera);
          if (hallado.tipo === null) return listo(fotoInvalida());
        }
      }
      listo(null, trozo);
    },
    flush(listo) {
      if (hallado.tipo === null) hallado.tipo = tipoDeImagen(cabecera);
      listo(hallado.tipo === null || bytes < MIN_BYTES_FOTO ? fotoInvalida() : null);
    },
  });
  try {
    await pipeline(parte.file, comprobar, createWriteStream(parcial));
    if (parte.file.truncated) throw fotoMuyGrande();
  } catch (e) {
    await rm(parcial, { force: true });
    parte.file.resume();
    if (e instanceof AppError) throw e;
    if (e instanceof Error && 'code' in e && e.code === 'FST_REQ_FILE_TOO_LARGE') throw fotoMuyGrande();
    throw e;
  }
  const final = hallado.tipo;
  if (final === null) {
    await rm(parcial, { force: true });
    throw fotoInvalida();
  }
  const archivo = `${id}.${final}`;
  const ruta = join(dir, archivo);
  await rename(parcial, ruta);
  return { archivo, ruta };
}

export async function borrarFoto(ruta: string | null | undefined): Promise<void> {
  if (ruta) await rm(ruta, { force: true });
}
