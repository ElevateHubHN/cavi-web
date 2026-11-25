import 'dotenv/config';
import { parseArgs } from 'node:util';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../shared/prisma.js';
import { hashClave } from '../modulos/clientes/cuentas.js';
import { isMain } from '../shared/entrypoint.js';

/**
 * Crea el primer administrador del panel (no hay registro público). Imprime la
 * clave temporal una sola vez. Si el correo ya existe, no lo toca.
 * Uso: npm run crear-admin -- --correo ana@repcavi.com --nombre "Ana"
 */
export async function crearAdmin(correo: string, nombre: string) {
  const c = z.string().trim().toLowerCase().email().parse(correo);
  const n = z.string().trim().min(1).max(120).parse(nombre);
  const existente = await prisma.usuario.findUnique({ where: { correo: c }, select: { id: true } });
  if (existente) return { creado: false, id: existente.id };
  const clave = randomBytes(12).toString('base64url');
  const usuario = await prisma.usuario.create({ data: { correo: c, nombre: n, rol: 'admin', claveHash: await hashClave(clave) }, select: { id: true } });
  return { creado: true, id: usuario.id, clave_temporal: clave };
}

if (isMain(import.meta.url)) {
  const { values } = parseArgs({ options: { correo: { type: 'string' }, nombre: { type: 'string' } } });
  crearAdmin(values.correo ?? '', values.nombre ?? '')
    .then((r) => console.log(JSON.stringify(r)))
    .catch(() => {
      console.error('No se pudo crear el administrador. Revisa --correo, --nombre y la conexión a la base.');
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
