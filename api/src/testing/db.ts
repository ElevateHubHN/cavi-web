import { readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../shared/prisma.js';
import { generarToken, hashClave, hashToken, huellaClaveTemporal } from '../modulos/clientes/cuentas.js';
import { transporteMemoria } from '../correos/transporte.js';
import { vaciarEnvios } from '../correos/correos.js';

export const DIR_ARCHIVOS = resolve(process.env.ARCHIVOS_DIR ?? 'tmp/archivos-test');

/** Vacía todas las tablas de cavi_test, el buzón y la carpeta de fotos de prueba. */
export async function limpiarBase(): Promise<void> {
  await vaciarEnvios();
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE
    correo, suscriptor, mensaje_contacto, cambio_estado, cotizacion_item, cotizacion,
    token_cliente, cliente, usuario RESTART IDENTITY CASCADE`);
  buzon.vaciar();
  await rm(DIR_ARCHIVOS, { recursive: true, force: true });
}

export interface CorreoEscrito {
  para: string;
  asunto: string;
  contenido: string;
}

/** Buzón en memoria que comparten las pruebas: ningún correo sale a la red. */
export const buzon = transporteMemoria();

/** Espera a que terminen los envíos que quedaron en curso después de responder. */
export const esperarCorreos = vaciarEnvios;

/** Correos enviados desde la última limpieza, del más viejo al más nuevo. */
export async function correosEscritos(): Promise<CorreoEscrito[]> {
  await esperarCorreos();
  return buzon.mensajes.map((m) => ({ para: m.para, asunto: m.asunto, contenido: `${m.texto}\n${m.html}` }));
}

export const tokenDe = (c: CorreoEscrito): string => /confirmar\?token=([0-9a-f]{64})/.exec(c.contenido)?.[1] ?? '';
export const claveTemporalDe = (c: CorreoEscrito): string => /Clave temporal: ([A-Za-z0-9]{10})/.exec(c.contenido)?.[1] ?? '';

export async function archivosDeFotos(): Promise<string[]> {
  try {
    return await readdir(DIR_ARCHIVOS);
  } catch {
    return [];
  }
}

/** Con `debeCambiarClave`, la cuenta no tiene clave propia y `clave` es una temporal vigente. */
export async function crearCliente(datos: { correo?: string; clave?: string; confirmado?: boolean; debeCambiarClave?: boolean; telefono?: string; rtn?: string | null } = {}) {
  const clave = datos.clave ?? 'clave-de-prueba-1';
  const cliente = await prisma.cliente.create({
    data: {
      correo: datos.correo ?? `c${Math.random().toString(36).slice(2, 10)}@cliente.test`,
      nombre: 'Cliente de Prueba',
      telefono: datos.telefono ?? '+504 9999-0000',
      rtn: datos.rtn ?? null,
      claveHash: datos.debeCambiarClave ? null : await hashClave(clave),
      correoConfirmado: datos.confirmado ?? true,
      ...(datos.debeCambiarClave
        ? { tokens: { create: { tipo: 'clave_temporal', tokenHash: hashToken(generarToken()), claveHash: huellaClaveTemporal(clave), venceEn: new Date(Date.now() + 24 * 3600 * 1000) } } }
        : {}),
    },
  });
  return { cliente, clave };
}

export const CLAVE_ASESOR = 'clave-de-asesor-1';

export async function crearAsesor(datos: { correo?: string; nombre?: string; rol?: 'admin' | 'asesor'; debeCambiarClave?: boolean; activo?: boolean } = {}) {
  return prisma.usuario.create({
    data: {
      correo: datos.correo ?? `a${Math.random().toString(36).slice(2, 10)}@repcavi.test`,
      nombre: datos.nombre ?? 'Karla Mejía',
      claveHash: await hashClave(CLAVE_ASESOR),
      rol: datos.rol ?? 'asesor',
      debeCambiarClave: datos.debeCambiarClave ?? false,
      activo: datos.activo ?? true,
    },
  });
}

export function cookieDe(res: { headers: Record<string, unknown> }, nombre = 'cavi_cliente'): string {
  const set = res.headers['set-cookie'];
  const lineas = Array.isArray(set) ? set : [set];
  const linea = lineas.map(String).find((l) => l.startsWith(`${nombre}=`)) ?? '';
  return linea.split(';')[0] ?? '';
}

/** Ingresa al panel y devuelve la cookie `cavi_panel=…` lista para el encabezado. */
export async function ingresarAlPanel(app: FastifyInstance, correo: string, clave = CLAVE_ASESOR): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/api/panel/ingresar', payload: { correo, clave } });
  if (res.statusCode !== 200) throw new Error(`No se pudo ingresar al panel: ${res.statusCode} ${res.body}`);
  return cookieDe(res, 'cavi_panel');
}

export async function ingresarComo(app: FastifyInstance, correo: string, clave: string): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/api/auth/ingresar', payload: { correo, clave } });
  if (res.statusCode !== 200) throw new Error(`No se pudo ingresar: ${res.statusCode} ${res.body}`);
  return cookieDe(res);
}

export interface Foto {
  nombre: string;
  tipo: string;
  contenido: Buffer;
}

/** Cuerpo multipart como lo arma el navegador: el campo `datos` con el JSON y, si viene, la foto. */
export function formulario(datos: unknown, foto?: Foto): { payload: Buffer; headers: Record<string, string> } {
  const limite = `----limite${Math.random().toString(16).slice(2)}`;
  const partes: Buffer[] = [
    Buffer.from(`--${limite}\r\nContent-Disposition: form-data; name="datos"\r\n\r\n${JSON.stringify(datos)}\r\n`),
  ];
  if (foto) {
    partes.push(Buffer.from(`--${limite}\r\nContent-Disposition: form-data; name="foto"; filename="${foto.nombre}"\r\nContent-Type: ${foto.tipo}\r\n\r\n`));
    partes.push(foto.contenido, Buffer.from('\r\n'));
  }
  partes.push(Buffer.from(`--${limite}--\r\n`));
  return { payload: Buffer.concat(partes), headers: { 'content-type': `multipart/form-data; boundary=${limite}` } };
}

export const JPEG_MINIMO = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);

export function jpegDe(bytes: number): Buffer {
  const b = Buffer.alloc(bytes, 0x20);
  JPEG_MINIMO.copy(b, 0);
  return b;
}

export function solicitudDePrueba(extra: Record<string, unknown> = {}) {
  return {
    nombre: 'Lourdes Paz',
    correo: 'lourdes@transportes.test',
    telefono: '+504 9988-7766',
    empresa: 'Transportes Paz',
    rtn: '08011999123456',
    entrega: { modo: 'retiro', sucursal: 'Casa Matriz · San Pedro Sula' },
    equipo: 'Cabezal 6x4',
    serie: 'CAT0330CJKM01844',
    notas: 'Lo necesito antes del viernes.',
    piezas: [
      { productoId: 'p1', nombre: 'Filtro de aceite', numeroParte: '1R-0750', cantidad: 2 },
      { productoId: 'p2', nombre: 'Kit de empaques', numeroParte: '245-3456', cantidad: 1 },
    ],
    ...extra,
  };
}
