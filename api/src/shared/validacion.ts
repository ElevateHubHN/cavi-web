import { z } from 'zod';

export const MAX_TEXTO_LIBRE = 2000;
export const POR_PAGINA = 50;

export const correo = z.string().trim().toLowerCase().email('Escribe un correo válido.').max(200);

export const texto = (max: number) => z.string().trim().min(1).max(max);

/** Opcional: vacío o solo espacios cuenta como no enviado. */
export const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const pagina = z.coerce.number().int().min(1).max(100_000).default(1);
