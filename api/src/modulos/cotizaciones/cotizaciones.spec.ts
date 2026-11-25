import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, utimes, writeFile } from 'node:fs/promises';
import { createServer, type AddressInfo, type Socket } from 'node:net';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { buildServer } from '../../server.js';
import { prisma } from '../../shared/prisma.js';
import { cambiarEstado, enviarCotizacion, quitarFotoPorAntiguedad } from '../../dominio/cotizaciones.js';
import { limpiarFotos } from './limpieza-fotos.js';
import { reintentarPendientes } from '../../correos/correos.js';
import { transporteSmtp, type Transporte } from '../../correos/transporte.js';
import {
  DIR_ARCHIVOS,
  archivosDeFotos,
  buzon,
  claveTemporalDe,
  cookieDe,
  correosEscritos,
  crearAsesor,
  crearCliente,
  esperarCorreos,
  formulario,
  ingresarComo,
  jpegDe,
  limpiarBase,
  solicitudDePrueba,
  tokenDe,
} from '../../testing/db.js';

let app: FastifyInstance;

const arrancarCorreos = async (arranque: Date) => {
  await reintentarPendientes(prisma, buzon, app.log, arranque);
};

beforeAll(async () => {
  app = await buildServer({ limitesPorIp: false, transporteCorreo: buzon });
});
afterAll(async () => {
  await app.close();
});
beforeEach(async () => {
  await limpiarBase();
});

const pedir = (datos: unknown, opciones: { cookie?: string; foto?: Parameters<typeof formulario>[1] } = {}) => {
  const f = formulario(datos, opciones.foto);
  return app.inject({ method: 'POST', url: '/api/cotizaciones', payload: f.payload, headers: { ...f.headers, ...(opciones.cookie ? { cookie: opciones.cookie } : {}) } });
};

async function contar() {
  return { clientes: await prisma.cliente.count(), cotizaciones: await prisma.cotizacion.count(), correos: (await correosEscritos()).length };
}

async function cotizar(numero: number) {
  const asesor = await crearAsesor();
  const items = await prisma.cotizacionItem.findMany({ where: { cotizacion: { numero } }, select: { id: true } });
  await enviarCotizacion(prisma, {
    numero,
    usuarioId: asesor.id,
    precios: items.map((i, k) => ({ itemId: i.id, precioUnitario: new Prisma.Decimal(k === 0 ? '1250.50' : '300') })),
  });
  return asesor;
}

async function clienteConfirmadoConCotizacion(correo = 'lourdes@transportes.test') {
  const { cliente, clave } = await crearCliente({ correo, confirmado: true });
  const cookie = await ingresarComo(app, correo, clave);
  const res = await pedir(solicitudDePrueba({ correo }), { cookie });
  expect(res.statusCode).toBe(201);
  const numero = Number(String(res.json().numero).replace('CT-', ''));
  return { cliente, cookie, numero };
}

describe('POST /api/cotizaciones sin sesión', () => {
  it('con un correo nuevo crea el cliente sin confirmar, CT-1042 y dos correos; la respuesta no trae clave ni token', async () => {
    const res = await pedir(solicitudDePrueba());
    expect(res.statusCode).toBe(201);
    const cuerpo = res.json();
    expect(cuerpo).toEqual({ numero: 'CT-1042', correo: 'lourdes@transportes.test' });

    const cliente = await prisma.cliente.findUniqueOrThrow({ where: { correo: 'lourdes@transportes.test' } });
    expect(cliente.correoConfirmado).toBe(false);
    expect(cliente.claveHash).toBeNull();

    const correos = await correosEscritos();
    expect(correos).toHaveLength(2);
    const alCliente = correos.find((c) => c.para.includes('lourdes@transportes.test'));
    const aCavi = correos.find((c) => c.para.includes('avisos@cavi.example'));
    expect(alCliente?.asunto).toContain('CT-1042');
    expect(aCavi?.asunto).toContain('Solicitud nueva CT-1042');
    const token = alCliente ? tokenDe(alCliente) : '';
    const clave = alCliente ? claveTemporalDe(alCliente) : '';
    expect(token).toHaveLength(64);
    expect(clave).toHaveLength(10);
    expect(res.body).not.toContain(token);
    expect(res.body).not.toContain(clave);
    expect(aCavi?.contenido).not.toContain(token);
    expect(aCavi?.contenido).not.toContain(clave);

    const bitacora = await prisma.correo.findMany({ orderBy: { tipo: 'asc' } });
    expect(bitacora.map((c) => [c.tipo, c.estado])).toEqual([
      ['confirmacion', 'enviado'],
      ['aviso_solicitud_nueva', 'enviado'],
    ]);
  });

  it('guarda las piezas tal como se pidieron, con el contacto y la entrega', async () => {
    await pedir(solicitudDePrueba());
    const c = await prisma.cotizacion.findUniqueOrThrow({ where: { numero: 1042 }, include: { items: { orderBy: { orden: 'asc' } }, cambios: true } });
    expect(c.estado).toBe('recibida');
    expect(c.sucursal).toBe('Casa Matriz · San Pedro Sula');
    expect(c.rtn).toBe('08011999123456');
    expect(c.items.map((i) => [i.nombre, i.numeroParte, i.cantidad])).toEqual([
      ['Filtro de aceite', '1R-0750', 2],
      ['Kit de empaques', '245-3456', 1],
    ]);
    expect(c.cambios).toHaveLength(1);
  });

  it.each([
    ['sin nombre', { nombre: '' }],
    ['sin piezas', { piezas: [] }],
    ['con 51 piezas', { piezas: Array.from({ length: 51 }, (_, i) => ({ productoId: `p${i}`, nombre: 'Pieza', numeroParte: `N-${i}`, cantidad: 1 })) }],
    ['con cantidad 0', { piezas: [{ productoId: 'p1', nombre: 'Pieza', numeroParte: 'N-1', cantidad: 0 }] }],
    ['con cantidad 1000', { piezas: [{ productoId: 'p1', nombre: 'Pieza', numeroParte: 'N-1', cantidad: 1000 }] }],
    ['con notas de más de 2.000 caracteres', { notas: 'x'.repeat(2001) }],
    ['envío sin dirección', { entrega: { modo: 'envio', departamento: 'Yoro', ciudad: 'El Progreso' } }],
    ['sin correo', { correo: undefined }],
  ])('%s responde 400 y no crea cliente, cotización ni correo', async (_caso, cambio) => {
    const res = await pedir(solicitudDePrueba(cambio));
    expect(res.statusCode).toBe(400);
    expect(await contar()).toEqual({ clientes: 0, cotizaciones: 0, correos: 0 });
  });

  it('acepta exactamente 50 piezas con cantidad 999', async () => {
    const piezas = Array.from({ length: 50 }, (_, i) => ({ productoId: `p${i}`, nombre: 'Pieza', numeroParte: `N-${i}`, cantidad: 999 }));
    const res = await pedir(solicitudDePrueba({ piezas }));
    expect(res.statusCode).toBe(201);
  });

  it('un envío que no es formulario responde 415 y no guarda nada', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/cotizaciones', payload: solicitudDePrueba() });
    expect(res.statusCode).toBe(415);
    expect(await contar()).toEqual({ clientes: 0, cotizaciones: 0, correos: 0 });
  });

  it('con el correo de una cuenta confirmada agrega la cotización y no cambia teléfono ni RTN de la cuenta', async () => {
    const { cliente } = await crearCliente({ correo: 'lourdes@transportes.test', telefono: '+504 1111-2222', rtn: '05019999000001' });
    const res = await pedir(solicitudDePrueba({ telefono: '+504 3333-4444', rtn: '08011999123456', nombre: 'Otro Nombre' }));
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ numero: 'CT-1042', correo: 'lourdes@transportes.test' });

    const cuenta = await prisma.cliente.findUniqueOrThrow({ where: { id: cliente.id } });
    expect(cuenta.telefono).toBe('+504 1111-2222');
    expect(cuenta.rtn).toBe('05019999000001');
    expect(cuenta.nombre).toBe('Cliente de Prueba');
    expect(cuenta.claveHash).toBe(cliente.claveHash);

    const c = await prisma.cotizacion.findUniqueOrThrow({ where: { numero: 1042 } });
    expect(c.clienteId).toBe(cliente.id);
    expect(c.telefono).toBe('+504 3333-4444');
    expect(c.rtn).toBe('08011999123456');
    expect(c.nombre).toBe('Otro Nombre');

    const correos = await correosEscritos();
    expect(correos).toHaveLength(1);
    expect(correos[0]?.para).toContain('avisos@cavi.example');
  });

  it('la respuesta es idéntica para un correo nuevo, uno sin confirmar y uno confirmado; los correos sí cambian', async () => {
    await crearCliente({ correo: 'confirmada@cliente.test', confirmado: true });
    await crearCliente({ correo: 'pendiente@cliente.test', confirmado: false });
    const respuestas = [];
    for (const correo of ['nueva@cliente.test', 'pendiente@cliente.test', 'confirmada@cliente.test']) {
      const res = await pedir(solicitudDePrueba({ correo }));
      respuestas.push({ status: res.statusCode, claves: Object.keys(res.json()).sort(), correo: res.json().correo });
    }
    expect(respuestas).toEqual([
      { status: 201, claves: ['correo', 'numero'], correo: 'nueva@cliente.test' },
      { status: 201, claves: ['correo', 'numero'], correo: 'pendiente@cliente.test' },
      { status: 201, claves: ['correo', 'numero'], correo: 'confirmada@cliente.test' },
    ]);
    const confirmaciones = (await correosEscritos()).filter((c) => !c.para.includes('avisos@')).map((c) => c.para);
    expect(confirmaciones).toEqual(['nueva@cliente.test', 'pendiente@cliente.test']);
  });

  it('el correo se compara sin mayúsculas ni espacios', async () => {
    await crearCliente({ correo: 'lourdes@transportes.test' });
    const res = await pedir(solicitudDePrueba({ correo: '  Lourdes@Transportes.TEST ' }));
    expect(res.json()).toEqual({ numero: 'CT-1042', correo: 'lourdes@transportes.test' });
    expect(await prisma.cliente.count()).toBe(1);
  });
});

describe('POST /api/cotizaciones con sesión', () => {
  it('usa la cuenta de la sesión, no manda correo de cuenta y sí avisa a CAVI', async () => {
    const { cliente, clave } = await crearCliente({ correo: 'cuenta@cliente.test', telefono: '+504 1111-2222' });
    const cookie = await ingresarComo(app, 'cuenta@cliente.test', clave);
    const res = await pedir(solicitudDePrueba({ correo: 'otro@cliente.test', telefono: '+504 5555-6666' }), { cookie });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ numero: 'CT-1042', correo: 'cuenta@cliente.test', enPortal: true });

    expect(await prisma.cliente.count()).toBe(1);
    const c = await prisma.cotizacion.findUniqueOrThrow({ where: { numero: 1042 } });
    expect(c.clienteId).toBe(cliente.id);
    expect(c.telefono).toBe('+504 5555-6666');
    expect((await prisma.cliente.findUniqueOrThrow({ where: { id: cliente.id } })).telefono).toBe('+504 1111-2222');

    const correos = await correosEscritos();
    expect(correos).toHaveLength(1);
    expect(correos[0]?.para).toContain('avisos@cavi.example');
    expect(await prisma.correo.count({ where: { tipo: 'confirmacion' } })).toBe(0);
  });

  it('con una cookie adulterada se comporta como sin sesión', async () => {
    await crearCliente({ correo: 'cuenta@cliente.test' });
    const res = await pedir(solicitudDePrueba({ correo: 'nuevo@cliente.test' }), { cookie: 'cavi_cliente=eyJhbGciOiJIUzI1NiJ9.e30.firma-falsa' });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ numero: 'CT-1042', correo: 'nuevo@cliente.test' });
  });
});

describe('foto del vehículo', () => {
  it('un JPEG de 2 MB queda guardado y asociado', async () => {
    const res = await pedir(solicitudDePrueba(), { foto: { nombre: 'cabezal.jpg', tipo: 'image/jpeg', contenido: jpegDe(2 * 1024 * 1024) } });
    expect(res.statusCode).toBe(201);
    const c = await prisma.cotizacion.findUniqueOrThrow({ where: { numero: 1042 } });
    expect(c.fotoArchivo).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(await archivosDeFotos()).toEqual([c.fotoArchivo]);
  });

  it('acepta PNG y WebP por su contenido', async () => {
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100)]);
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(100)]);
    expect((await pedir(solicitudDePrueba(), { foto: { nombre: 'a.png', tipo: 'image/png', contenido: png } })).statusCode).toBe(201);
    expect((await pedir(solicitudDePrueba(), { foto: { nombre: 'b.webp', tipo: 'image/webp', contenido: webp } })).statusCode).toBe(201);
    expect((await archivosDeFotos()).sort().map((a) => a.split('.')[1])).toEqual(expect.arrayContaining(['png', 'webp']));
  });

  it('una foto de 6 MB responde 413 y no deja archivo ni cotización', async () => {
    const res = await pedir(solicitudDePrueba(), { foto: { nombre: 'grande.jpg', tipo: 'image/jpeg', contenido: jpegDe(6 * 1024 * 1024) } });
    expect(res.statusCode).toBe(413);
    expect(await archivosDeFotos()).toEqual([]);
    expect(await contar()).toEqual({ clientes: 0, cotizaciones: 0, correos: 0 });
  });

  it('un .exe renombrado a .jpg responde 400 y no deja archivo ni cotización', async () => {
    const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(4096, 0x90)]);
    const res = await pedir(solicitudDePrueba(), { foto: { nombre: 'foto.jpg', tipo: 'image/jpeg', contenido: exe } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('foto_invalida');
    expect(await archivosDeFotos()).toEqual([]);
    expect(await contar()).toEqual({ clientes: 0, cotizaciones: 0, correos: 0 });
  });

  it('una foto válida con datos inválidos responde 400 y la foto no queda en disco', async () => {
    const res = await pedir(solicitudDePrueba({ piezas: [] }), { foto: { nombre: 'ok.jpg', tipo: 'image/jpeg', contenido: jpegDe(1024) } });
    expect(res.statusCode).toBe(400);
    expect(await archivosDeFotos()).toEqual([]);
  });
});

describe('correo caído', () => {
  it('si el envío falla la cotización igual se guarda, el correo queda fallido y el cliente ve su número', async () => {
    const caido: Transporte = {
      enviar: async () => {
        throw new Error('connect ECONNREFUSED');
      },
    };
    const otra = await buildServer({ limitesPorIp: false, transporteCorreo: caido });
    try {
      const f = formulario(solicitudDePrueba());
      const res = await otra.inject({ method: 'POST', url: '/api/cotizaciones', payload: f.payload, headers: f.headers });
      expect(res.statusCode).toBe(201);
      expect(res.json().numero).toBe('CT-1042');
      expect(await prisma.cotizacion.count()).toBe(1);
      await esperarCorreos();
      const bitacora = await prisma.correo.findMany();
      expect(bitacora).toHaveLength(2);
      expect(bitacora.every((c) => c.estado === 'fallido' && c.error?.includes('ECONNREFUSED'))).toBe(true);
    } finally {
      await otra.close().catch(() => undefined);
    }
  });
});

describe('mis cotizaciones', () => {
  it('el dueño ve la suya y otro cliente recibe 404', async () => {
    const { cookie, numero } = await clienteConfirmadoConCotizacion();
    const propia = await app.inject({ method: 'GET', url: `/api/cotizaciones/mias/CT-${numero}`, headers: { cookie } });
    expect(propia.statusCode).toBe(200);
    expect(propia.json()).toMatchObject({ numero: `CT-${numero}`, estado: 'recibida', total: null });

    const { clave } = await crearCliente({ correo: 'ajeno@cliente.test' });
    const ajena = await ingresarComo(app, 'ajeno@cliente.test', clave);
    const res = await app.inject({ method: 'GET', url: `/api/cotizaciones/mias/CT-${numero}`, headers: { cookie: ajena } });
    expect(res.statusCode).toBe(404);
    expect(res.body).not.toContain('Lourdes');
    const lista = await app.inject({ method: 'GET', url: '/api/cotizaciones/mias', headers: { cookie: ajena } });
    expect(lista.json()).toMatchObject({ cotizaciones: [], total: 0 });
  });

  it('sin sesión responde 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/cotizaciones/mias' });
    expect(res.statusCode).toBe(401);
  });

  it('los precios guardados como borrador no se ven hasta que se envía la cotización', async () => {
    const { cookie, numero } = await clienteConfirmadoConCotizacion();
    await prisma.cotizacionItem.updateMany({ where: { cotizacion: { numero } }, data: { precioUnitario: new Prisma.Decimal('100') } });
    const antes = await app.inject({ method: 'GET', url: `/api/cotizaciones/mias/${numero}`, headers: { cookie } });
    expect(antes.json().piezas.every((p: { precioUnitario: unknown }) => p.precioUnitario === null)).toBe(true);
    expect(antes.json().total).toBeNull();
    await cotizar(numero);
    const despues = await app.inject({ method: 'GET', url: `/api/cotizaciones/mias/${numero}`, headers: { cookie } });
    expect(despues.json().total).toBe(2 * 1250.5 + 300);
  });
});

describe('aceptar', () => {
  it('solo en cotizada: pasa a confirmada y avisa a CAVI una sola vez', async () => {
    const { cookie, numero } = await clienteConfirmadoConCotizacion();
    const enRecibida = await app.inject({ method: 'POST', url: `/api/cotizaciones/mias/CT-${numero}/aceptar`, headers: { cookie }, payload: { total: null } });
    expect(enRecibida.statusCode).toBe(409);
    expect((await prisma.cotizacion.findUniqueOrThrow({ where: { numero } })).estado).toBe('recibida');

    await cotizar(numero);
    const antes = (await correosEscritos()).length;
    const res = await app.inject({ method: 'POST', url: `/api/cotizaciones/mias/CT-${numero}/aceptar`, headers: { cookie }, payload: { total: '2801.00' } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ estado: 'confirmada', total: 2801 });
    const despues = await correosEscritos();
    expect(despues).toHaveLength(antes + 1);
    expect(despues.at(-1)?.para).toContain('avisos@cavi.example');
    expect(despues.at(-1)?.contenido).toContain('L 2,801.00');

    const otraVez = await app.inject({ method: 'POST', url: `/api/cotizaciones/mias/CT-${numero}/aceptar`, headers: { cookie }, payload: { total: '2801.00' } });
    expect(otraVez.statusCode).toBe(409);
    expect(await correosEscritos()).toHaveLength(antes + 1);
    const c = await prisma.cotizacion.findUniqueOrThrow({ where: { numero }, include: { cambios: { orderBy: { creadoEn: 'asc' } } } });
    expect(c.confirmadaEn).not.toBeNull();
    expect(c.cambios.at(-1)).toMatchObject({ de: 'cotizada', a: 'confirmada', usuarioId: null, canal: 'sistema' });
  });

  it('dos aceptaciones a la vez dejan una sola confirmación y un solo aviso', async () => {
    const { cookie, numero } = await clienteConfirmadoConCotizacion();
    await cotizar(numero);
    const antes = (await correosEscritos()).length;
    const [a, b] = await Promise.all([
      app.inject({ method: 'POST', url: `/api/cotizaciones/mias/${numero}/aceptar`, headers: { cookie }, payload: { total: '2801.00' } }),
      app.inject({ method: 'POST', url: `/api/cotizaciones/mias/${numero}/aceptar`, headers: { cookie }, payload: { total: '2801.00' } }),
    ]);
    expect([a.statusCode, b.statusCode].sort()).toEqual([200, 409]);
    expect(await correosEscritos()).toHaveLength(antes + 1);
    expect(await prisma.cambioEstado.count({ where: { a: 'confirmada' } })).toBe(1);
  });

  it('la de otro cliente responde 404 y no cambia', async () => {
    const { numero } = await clienteConfirmadoConCotizacion();
    await cotizar(numero);
    const { clave } = await crearCliente({ correo: 'ajeno@cliente.test' });
    const ajena = await ingresarComo(app, 'ajeno@cliente.test', clave);
    const res = await app.inject({ method: 'POST', url: `/api/cotizaciones/mias/${numero}/aceptar`, headers: { cookie: ajena }, payload: { total: '2801.00' } });
    expect(res.statusCode).toBe(404);
    expect((await prisma.cotizacion.findUniqueOrThrow({ where: { numero } })).estado).toBe('cotizada');
  });

  it('una cotizada por fuera se acepta igual y el portal no muestra total sino el canal', async () => {
    const { cookie, numero } = await clienteConfirmadoConCotizacion();
    const asesor = await crearAsesor();
    await cambiarEstado(prisma, { numero, usuarioId: asesor.id, a: 'cotizada', canal: 'whatsapp' });
    const detalle = await app.inject({ method: 'GET', url: `/api/cotizaciones/mias/${numero}`, headers: { cookie } });
    expect(detalle.json()).toMatchObject({ estado: 'cotizada', total: null, cotizadaPor: 'whatsapp' });
    const res = await app.inject({ method: 'POST', url: `/api/cotizaciones/mias/${numero}/aceptar`, headers: { cookie }, payload: { total: null } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ estado: 'confirmada', cotizadaPor: 'whatsapp' });
  });
});

describe('cancelar desde el portal', () => {
  it.each(['recibida', 'en_revision', 'cotizada'] as const)('desde %s pasa a cancelada con su comentario y avisa a CAVI', async (estado) => {
    const { cookie, numero } = await clienteConfirmadoConCotizacion();
    await prisma.cotizacion.update({ where: { numero }, data: { estado } });
    const antes = (await correosEscritos()).length;
    const res = await app.inject({
      method: 'POST',
      url: `/api/cotizaciones/mias/CT-${numero}/cancelar`,
      headers: { cookie },
      payload: { comentario: 'Ya lo conseguí en otro lado' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ estado: 'cancelada', motivoCancelacion: 'Cancelada por el cliente desde su portal: Ya lo conseguí en otro lado' });
    const correos = await correosEscritos();
    expect(correos).toHaveLength(antes + 1);
    expect(correos.at(-1)?.para).toContain('avisos@cavi.example');
    expect(correos.at(-1)?.contenido).toContain('Ya lo conseguí en otro lado');

    const otraVez = await app.inject({ method: 'POST', url: `/api/cotizaciones/mias/CT-${numero}/cancelar`, headers: { cookie }, payload: {} });
    expect(otraVez.statusCode).toBe(409);
    expect(await correosEscritos()).toHaveLength(antes + 1);
  });

  it('sin comentario usa el motivo fijo', async () => {
    const { cookie, numero } = await clienteConfirmadoConCotizacion();
    const res = await app.inject({ method: 'POST', url: `/api/cotizaciones/mias/${numero}/cancelar`, headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json().motivoCancelacion).toBe('Cancelada por el cliente desde su portal');
  });

  it.each(['confirmada', 'entregada'] as const)('una %s responde 409 y no cambia ni manda correo', async (estado) => {
    const { cookie, numero } = await clienteConfirmadoConCotizacion();
    await prisma.cotizacion.update({ where: { numero }, data: { estado } });
    const antes = (await correosEscritos()).length;
    const res = await app.inject({ method: 'POST', url: `/api/cotizaciones/mias/${numero}/cancelar`, headers: { cookie }, payload: {} });
    expect(res.statusCode).toBe(409);
    expect((await prisma.cotizacion.findUniqueOrThrow({ where: { numero } })).estado).toBe(estado);
    expect(await correosEscritos()).toHaveLength(antes);
  });

  it('la de otro cliente responde 404 y no cambia', async () => {
    const { numero } = await clienteConfirmadoConCotizacion();
    const { clave } = await crearCliente({ correo: 'ajeno@cliente.test' });
    const ajena = await ingresarComo(app, 'ajeno@cliente.test', clave);
    const res = await app.inject({ method: 'POST', url: `/api/cotizaciones/mias/${numero}/cancelar`, headers: { cookie: ajena }, payload: {} });
    expect(res.statusCode).toBe(404);
    expect((await prisma.cotizacion.findUniqueOrThrow({ where: { numero } })).estado).toBe('recibida');
  });
});

describe('cuenta sin confirmar que recibe otra solicitud', () => {
  const correoCuenta = async () => (await correosEscritos()).filter((c) => c.para === 'lourdes@transportes.test');

  it('no pisa los datos de la cuenta; el enlace y la clave del primer correo siguen sirviendo, y los del segundo también', async () => {
    expect((await pedir(solicitudDePrueba())).statusCode).toBe(201);
    const [primero] = await correoCuenta();
    const antes = await prisma.cliente.findUniqueOrThrow({ where: { correo: 'lourdes@transportes.test' } });

    const res = await pedir(solicitudDePrueba({ nombre: 'Intruso Ajeno', telefono: '+504 3333-4444', empresa: 'Otra', rtn: '05010000000000' }));
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ numero: 'CT-1043', correo: 'lourdes@transportes.test' });

    const cuenta = await prisma.cliente.findUniqueOrThrow({ where: { id: antes.id } });
    expect(cuenta).toMatchObject({ nombre: 'Lourdes Paz', telefono: '+504 9988-7766', empresa: 'Transportes Paz', rtn: '08011999123456', claveHash: antes.claveHash });
    expect((await prisma.cotizacion.findUniqueOrThrow({ where: { numero: 1043 } })).nombre).toBe('Intruso Ajeno');

    const segundo = (await correoCuenta())[1];
    expect(segundo?.contenido).toContain('Hola, Lourdes');
    expect(segundo?.contenido).not.toContain('Intruso');
    const clave1 = claveTemporalDe(primero ?? { para: '', asunto: '', contenido: '' });
    const clave2 = claveTemporalDe(segundo ?? { para: '', asunto: '', contenido: '' });
    expect(clave2).not.toBe(clave1);
    expect(await prisma.tokenCliente.count({ where: { clienteId: cuenta.id, claveHash: { not: null } } })).toBe(2);

    const confirma2 = await app.inject({ method: 'POST', url: '/api/auth/confirmar', payload: { token: tokenDe(segundo ?? { para: '', asunto: '', contenido: '' }) } });
    expect(confirma2.statusCode).toBe(200);
    const confirma1 = await app.inject({ method: 'POST', url: '/api/auth/confirmar', payload: { token: tokenDe(primero ?? { para: '', asunto: '', contenido: '' }) } });
    expect(confirma1.statusCode).toBe(200);
    const conLaSegunda = await app.inject({ method: 'POST', url: '/api/auth/ingresar', payload: { correo: 'lourdes@transportes.test', clave: clave2 } });
    expect(conLaSegunda.statusCode).toBe(200);
  });

  it('la primera clave temporal sigue sirviendo después de un segundo correo', async () => {
    await pedir(solicitudDePrueba());
    const [primero] = await correoCuenta();
    await pedir(solicitudDePrueba({ nombre: 'Intruso Ajeno' }));
    await app.inject({ method: 'POST', url: '/api/auth/confirmar', payload: { token: tokenDe(primero ?? { para: '', asunto: '', contenido: '' }) } });
    const conLaPrimera = await app.inject({ method: 'POST', url: '/api/auth/ingresar', payload: { correo: 'lourdes@transportes.test', clave: claveTemporalDe(primero ?? { para: '', asunto: '', contenido: '' }) } });
    expect(conLaPrimera.statusCode).toBe(200);
  });

  it('caso contrario: la cuarta en una hora no manda correo ni cambia sus claves', async () => {
    for (let i = 0; i < 3; i++) expect((await pedir(solicitudDePrueba())).statusCode).toBe(201);
    const antes = await prisma.cliente.findUniqueOrThrow({ where: { correo: 'lourdes@transportes.test' } });
    const tokens = await prisma.tokenCliente.count();
    const res = await pedir(solicitudDePrueba());
    expect(res.json()).toEqual({ numero: 'CT-1045', correo: 'lourdes@transportes.test' });
    expect(await correoCuenta()).toHaveLength(3);
    const despues = await prisma.cliente.findUniqueOrThrow({ where: { id: antes.id } });
    expect(despues.claveHash).toBe(antes.claveHash);
    expect(await prisma.tokenCliente.count()).toBe(tokens);
    expect(await prisma.correo.count({ where: { tipo: 'confirmacion', estado: 'omitido' } })).toBe(1);
  });
});

describe('correo lento', () => {
  it('con el SMTP colgado la solicitud responde enseguida; los dos correos quedan pendientes y después enviados', async () => {
    let soltar: () => void = () => undefined;
    const colgado = new Promise<void>((r) => {
      soltar = r;
    });
    const lento: Transporte = {
      async enviar(m) {
        await colgado;
        await buzon.enviar(m);
      },
    };
    const otra = await buildServer({ limitesPorIp: false, transporteCorreo: lento });
    try {
      const f = formulario(solicitudDePrueba());
      const respuesta = otra.inject({ method: 'POST', url: '/api/cotizaciones', payload: f.payload, headers: f.headers });
      const res = await Promise.race([respuesta, new Promise<null>((r) => setTimeout(() => r(null), 3000))]);
      expect(res, 'la respuesta esperó al servidor de correo').not.toBeNull();
      expect(res?.statusCode).toBe(201);
      expect((await prisma.correo.findMany()).map((c) => `${c.tipo}:${c.estado}`).sort()).toEqual(['aviso_solicitud_nueva:pendiente', 'confirmacion:pendiente']);
      soltar();
      await esperarCorreos();
      expect((await prisma.correo.findMany()).map((c) => c.estado)).toEqual(['enviado', 'enviado']);
      expect(buzon.mensajes).toHaveLength(2);
    } finally {
      soltar();
      await otra.close().catch(() => undefined);
    }
  });

  it('con un servidor SMTP que no contesta, la solicitud responde en menos de 2 s y el correo queda fallido por tiempo de espera', async () => {
    const conexiones = new Set<Socket>();
    const mudo = createServer((s) => {
      conexiones.add(s);
      s.on('close', () => conexiones.delete(s));
    });
    await new Promise<void>((r) => mudo.listen(0, '127.0.0.1', r));
    const puerto = (mudo.address() as AddressInfo).port;
    const smtp = transporteSmtp({ SMTP_HOST: '127.0.0.1', SMTP_PORT: puerto, SMTP_SECURE: false, SMTP_USER: undefined, SMTP_PASSWORD: undefined, CORREO_REMITENTE: 'CAVI <no-responder@cavi.example>' });
    const otra = await buildServer({ limitesPorIp: false, transporteCorreo: smtp });
    try {
      const f = formulario(solicitudDePrueba());
      const inicio = Date.now();
      const res = await otra.inject({ method: 'POST', url: '/api/cotizaciones', payload: f.payload, headers: f.headers });
      const demora = Date.now() - inicio;
      expect(res.statusCode).toBe(201);
      expect(demora, `la solicitud tardó ${demora} ms`).toBeLessThan(2000);
      await esperarCorreos();
      expect(Date.now() - inicio).toBeLessThan(25_000);
      const filas = await prisma.correo.findMany();
      expect(filas.map((c) => c.estado)).toEqual(['fallido', 'fallido']);
    } finally {
      for (const s of conexiones) s.destroy();
      await new Promise<void>((r) => mudo.close(() => r()));
      await otra.close().catch(() => undefined);
    }
  }, 45_000);
});

describe('aceptar el precio que vio', () => {
  it('con el total que ve el cliente se confirma y la bitácora guarda ese total', async () => {
    const { cookie, numero } = await clienteConfirmadoConCotizacion();
    await cotizar(numero);
    const res = await app.inject({ method: 'POST', url: `/api/cotizaciones/mias/${numero}/aceptar`, headers: { cookie }, payload: { total: '2801.00' } });
    expect(res.statusCode).toBe(200);
    const ultimo = await prisma.cambioEstado.findFirstOrThrow({ where: { a: 'confirmada' } });
    expect(ultimo.nota).toContain('L 2,801.00');
  });

  it('caso contrario: si los precios cambiaron responde 409 precio_cambio, no confirma ni avisa', async () => {
    const { cookie, numero } = await clienteConfirmadoConCotizacion();
    await cotizar(numero);
    const antes = (await correosEscritos()).length;
    const filas = await prisma.cambioEstado.count();
    const res = await app.inject({ method: 'POST', url: `/api/cotizaciones/mias/${numero}/aceptar`, headers: { cookie }, payload: { total: '45090.50' } });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('precio_cambio');
    expect((await prisma.cotizacion.findUniqueOrThrow({ where: { numero } })).estado).toBe('cotizada');
    expect(await prisma.cambioEstado.count()).toBe(filas);
    expect(await correosEscritos()).toHaveLength(antes);
  });

  it('sin el total responde 400 y no confirma', async () => {
    const { cookie, numero } = await clienteConfirmadoConCotizacion();
    await cotizar(numero);
    const res = await app.inject({ method: 'POST', url: `/api/cotizaciones/mias/${numero}/aceptar`, headers: { cookie }, payload: {} });
    expect(res.statusCode).toBe(400);
    expect((await prisma.cotizacion.findUniqueOrThrow({ where: { numero } })).estado).toBe('cotizada');
  });

  it('una cotizada por fuera se acepta sin total; con un total responde 409', async () => {
    const { cookie, numero } = await clienteConfirmadoConCotizacion();
    const asesor = await crearAsesor();
    await cambiarEstado(prisma, { numero, usuarioId: asesor.id, a: 'cotizada', canal: 'whatsapp' });
    const conTotal = await app.inject({ method: 'POST', url: `/api/cotizaciones/mias/${numero}/aceptar`, headers: { cookie }, payload: { total: '0.00' } });
    expect(conTotal.statusCode).toBe(409);
    const res = await app.inject({ method: 'POST', url: `/api/cotizaciones/mias/${numero}/aceptar`, headers: { cookie }, payload: { total: null } });
    expect(res.statusCode).toBe(200);
  });
});

describe('formularios y fotos dudosos', () => {
  it('una imagen de menos de 100 bytes responde 400 y no deja archivo ni cotización', async () => {
    const res = await pedir(solicitudDePrueba(), { foto: { nombre: 'mini.jpg', tipo: 'image/jpeg', contenido: jpegDe(99) } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('foto_invalida');
    expect(await archivosDeFotos()).toEqual([]);
    expect(await prisma.cotizacion.count()).toBe(0);
  });

  it('caso contrario: una de 100 bytes se guarda', async () => {
    const res = await pedir(solicitudDePrueba(), { foto: { nombre: 'justa.jpg', tipo: 'image/jpeg', contenido: jpegDe(100) } });
    expect(res.statusCode).toBe(201);
  });

  it.each([
    ['cortado sin cierre', (l: string) => `--${l}\r\nContent-Disposition: form-data; name="datos"\r\n\r\n{"nombre":"x"`],
    ['con una cabecera rota', (l: string) => `--${l}\r\nbasura sin dos puntos\r\n\r\nx\r\n--${l}--\r\n`],
    ['sin partes', (l: string) => `--${l}--\r\n`],
  ])('un formulario %s responde 400 y no guarda nada', async (_caso, cuerpo) => {
    const limite = 'limiteroto';
    const res = await app.inject({ method: 'POST', url: '/api/cotizaciones', payload: cuerpo(limite), headers: { 'content-type': `multipart/form-data; boundary=${limite}` } });
    expect(res.statusCode).toBe(400);
    expect(await prisma.cotizacion.count()).toBe(0);
  });
});

describe('limpieza de fotos viejas', () => {
  const hace = (dias: number) => new Date(Date.now() - dias * 24 * 3600 * 1000);
  let siguiente = 0;

  async function conFoto(estado: 'entregada' | 'cancelada' | 'cotizada', diasSinMovimiento: number) {
    siguiente++;
    const res = await pedir(solicitudDePrueba({ correo: `foto${siguiente}@cliente.test` }), { foto: { nombre: 'v.jpg', tipo: 'image/jpeg', contenido: jpegDe(1024) } });
    expect(res.statusCode).toBe(201);
    const numero = Number(String(res.json().numero).replace('CT-', ''));
    await prisma.cotizacion.update({ where: { numero }, data: { estado, creadaEn: hace(diasSinMovimiento + 1) } });
    await prisma.cambioEstado.updateMany({ where: { cotizacion: { numero } }, data: { creadoEn: hace(diasSinMovimiento) } });
    return prisma.cotizacion.findUniqueOrThrow({ where: { numero } });
  }

  it('borra la foto de una entregada y una cancelada de hace 7 meses y lo deja en la bitácora; una cotizada vieja o una entregada hace 5 meses no se tocan', async () => {
    const entregada = await conFoto('entregada', 210);
    const cancelada = await conFoto('cancelada', 200);
    const cotizada = await conFoto('cotizada', 400);
    const reciente = await conFoto('entregada', 150);

    expect(await limpiarFotos(prisma, DIR_ARCHIVOS, { retencionDias: 180 })).toEqual({ fotosViejas: 2, huerfanas: 0 });
    expect((await archivosDeFotos()).sort()).toEqual([cotizada.fotoArchivo, reciente.fotoArchivo].sort());
    for (const c of [entregada, cancelada]) {
      const despues = await prisma.cotizacion.findUniqueOrThrow({ where: { id: c.id }, include: { cambios: { orderBy: { creadoEn: 'desc' }, take: 1 } } });
      expect(despues.fotoArchivo).toBeNull();
      expect(despues.estado).toBe(c.estado);
      expect(despues.cambios[0]).toMatchObject({ de: c.estado, a: c.estado, usuarioId: null, canal: 'sistema', nota: 'Foto eliminada por antigüedad' });
    }
    for (const c of [cotizada, reciente]) {
      expect((await prisma.cotizacion.findUniqueOrThrow({ where: { id: c.id } })).fotoArchivo).toBe(c.fotoArchivo);
    }
    expect(await limpiarFotos(prisma, DIR_ARCHIVOS, { retencionDias: 180 })).toEqual({ fotosViejas: 0, huerfanas: 0 });
  });

  it('si el archivo ya no estaba, igual deja la cotización sin foto', async () => {
    const vieja = await conFoto('entregada', 300);
    await rm(join(DIR_ARCHIVOS, vieja.fotoArchivo ?? ''), { force: true });
    expect((await limpiarFotos(prisma, DIR_ARCHIVOS, { retencionDias: 180 })).fotosViejas).toBe(1);
    expect((await prisma.cotizacion.findUniqueOrThrow({ where: { id: vieja.id } })).fotoArchivo).toBeNull();
  });

  it('va en lotes: más de 100 viejas se borran todas', async () => {
    const base = await conFoto('entregada', 300);
    for (let i = 0; i < 120; i++) {
      const archivo = `${randomUUID()}.jpg`;
      await writeFile(join(DIR_ARCHIVOS, archivo), jpegDe(200));
      await prisma.cotizacion.create({
        data: {
          clienteId: base.clienteId,
          nombre: `Lote ${i}`,
          telefono: '1',
          modoEntrega: 'retiro',
          sucursal: 'Casa Matriz',
          estado: 'cancelada',
          fotoArchivo: archivo,
          creadaEn: hace(400),
          cambios: { create: { a: 'cancelada', canal: 'sistema', creadoEn: hace(300) } },
        },
      });
    }
    expect((await limpiarFotos(prisma, DIR_ARCHIVOS, { retencionDias: 180 })).fotosViejas).toBe(121);
    expect(await prisma.cotizacion.count({ where: { fotoArchivo: { not: null } } })).toBe(0);
    expect(await archivosDeFotos()).toEqual([]);
  });

  it('borra los archivos que ninguna cotización usa si tienen más de un día; los recientes y los ajenos quedan', async () => {
    await mkdir(DIR_ARCHIVOS, { recursive: true });
    const viejo = `${randomUUID()}.jpg`;
    const parcialViejo = `${randomUUID()}.parcial`;
    const nuevo = `${randomUUID()}.png`;
    const ajeno = 'leeme.txt';
    for (const a of [viejo, parcialViejo, nuevo, ajeno]) await writeFile(join(DIR_ARCHIVOS, a), 'x');
    for (const a of [viejo, parcialViejo, ajeno]) await utimes(join(DIR_ARCHIVOS, a), hace(2), hace(2));
    const enUso = await conFoto('cotizada', 3);
    await utimes(join(DIR_ARCHIVOS, enUso.fotoArchivo ?? ''), hace(5), hace(5));

    expect(await limpiarFotos(prisma, DIR_ARCHIVOS, { retencionDias: 180 })).toEqual({ fotosViejas: 0, huerfanas: 2 });
    expect((await archivosDeFotos()).sort()).toEqual([ajeno, enUso.fotoArchivo, nuevo].sort());
  });

  it('una que el asesor movió después de entrar en el lote no se toca', async () => {
    const vieja = await conFoto('entregada', 300);
    const asesor = await crearAsesor();
    await prisma.cambioEstado.create({ data: { cotizacionId: vieja.id, de: 'entregada', a: 'entregada', canal: 'tienda', usuarioId: asesor.id, nota: 'Garantía' } });
    expect(await quitarFotoPorAntiguedad(prisma, { numero: vieja.numero, limite: hace(180) })).toBeNull();
    expect((await prisma.cotizacion.findUniqueOrThrow({ where: { id: vieja.id } })).fotoArchivo).toBe(vieja.fotoArchivo);
  });
});

describe('cada clave temporal vale por su cuenta', () => {
  const vacio = { para: '', asunto: '', contenido: '' };
  const deLourdes = async () => (await correosEscritos()).filter((c) => c.para === 'lourdes@transportes.test');
  const ingresar = (clave: string) => app.inject({ method: 'POST', url: '/api/auth/ingresar', payload: { correo: 'lourdes@transportes.test', clave } });

  it('con tres solicitudes sobre una cuenta sin confirmar, la clave del segundo correo sigue sirviendo', async () => {
    for (let i = 0; i < 3; i++) expect((await pedir(solicitudDePrueba())).statusCode).toBe(201);
    const correos = await deLourdes();
    expect(correos).toHaveLength(3);
    const confirma = await app.inject({ method: 'POST', url: '/api/auth/confirmar', payload: { token: tokenDe(correos[2] ?? vacio) } });
    expect(confirma.statusCode).toBe(200);
    expect((await ingresar(claveTemporalDe(correos[1] ?? vacio))).statusCode).toBe(200);
  });

  it('dos «olvidé mi clave» seguidos: la primera clave sigue sirviendo; al usarla, la segunda deja de servir', async () => {
    await crearCliente({ correo: 'lourdes@transportes.test', clave: 'mi-clave-propia-1' });
    for (let i = 0; i < 2; i++) await app.inject({ method: 'POST', url: '/api/auth/olvide-clave', payload: { correo: 'lourdes@transportes.test' } });
    const [primero, segundo] = await deLourdes();
    expect((await ingresar(claveTemporalDe(primero ?? vacio))).statusCode).toBe(200);
    expect((await ingresar(claveTemporalDe(segundo ?? vacio))).statusCode).toBe(401);
  });

  it('crear la clave propia anula las temporales que quedaban', async () => {
    const { cliente } = await crearCliente({ correo: 'lourdes@transportes.test', clave: 'mi-clave-propia-1' });
    for (let i = 0; i < 2; i++) await app.inject({ method: 'POST', url: '/api/auth/olvide-clave', payload: { correo: 'lourdes@transportes.test' } });
    const [primero, segundo] = await deLourdes();
    const sesion = cookieDe(await ingresar(claveTemporalDe(primero ?? vacio)));
    expect((await app.inject({ method: 'POST', url: '/api/me/clave', headers: { cookie: sesion }, payload: { nueva: 'otra-clave-propia-2' } })).statusCode).toBe(200);
    expect((await ingresar(claveTemporalDe(segundo ?? vacio))).statusCode).toBe(401);
    expect((await ingresar('otra-clave-propia-2')).statusCode).toBe(200);
    expect(await prisma.tokenCliente.count({ where: { clienteId: cliente.id, claveHash: { not: null } } })).toBe(0);
  });

  it('como mucho tres claves temporales vigentes: la cuarta deja sin efecto la más vieja', async () => {
    await crearCliente({ correo: 'lourdes@transportes.test', clave: 'mi-clave-propia-1' });
    for (let i = 0; i < 4; i++) {
      await app.inject({ method: 'POST', url: '/api/auth/olvide-clave', payload: { correo: 'lourdes@transportes.test' } });
      await esperarCorreos();
      await prisma.correo.updateMany({ data: { creadoEn: new Date(Date.now() - 2 * 3_600_000) } });
    }
    const correos = await deLourdes();
    expect(correos).toHaveLength(4);
    expect((await ingresar(claveTemporalDe(correos[0] ?? vacio))).statusCode).toBe(401);
    expect((await ingresar(claveTemporalDe(correos[1] ?? vacio))).statusCode).toBe(200);
  });
});

describe('correos que quedaron pendientes al reiniciar', () => {
  // No espera los envíos en curso: los de la instancia simulada como colgada no terminan hasta liberarlos.
  const escritos = () => buzon.mensajes.map((m) => ({ para: m.para, asunto: m.asunto, contenido: `${m.texto}
${m.html}` }));
  async function pendientesColgados() {
    let soltar: () => void = () => undefined;
    const colgado = new Promise<void>((r) => {
      soltar = r;
    });
    const lento: Transporte = {
      async enviar() {
        await colgado;
        throw new Error('la API se detuvo');
      },
    };
    const vieja = await buildServer({ limitesPorIp: false, transporteCorreo: lento });
    const f = formulario(solicitudDePrueba());
    expect((await vieja.inject({ method: 'POST', url: '/api/cotizaciones', payload: f.payload, headers: f.headers })).statusCode).toBe(201);
    await new Promise((r) => setTimeout(r, 300));
    return { cerrar: async () => {
      soltar();
      await esperarCorreos();
      await vieja.close().catch(() => undefined);
    } };
  }

  it('al arrancar los reintenta una vez: el aviso a CAVI y la confirmación salen, y el enlace del correo sirve', async () => {
    const { cerrar } = await pendientesColgados();
    try {
      await arrancarCorreos(new Date());
      const salieron = escritos();
      expect(salieron.map((c) => c.para).sort()).toEqual(['avisos@cavi.example', 'lourdes@transportes.test']);
      expect((await prisma.correo.findMany()).map((c) => c.estado)).toEqual(['enviado', 'enviado']);
      const conf = salieron.find((c) => c.para === 'lourdes@transportes.test');
      const r = await app.inject({ method: 'POST', url: '/api/auth/confirmar', payload: { token: conf ? tokenDe(conf) : '' } });
      expect(r.statusCode).toBe(200);
    } finally {
      await cerrar();
    }
    expect((await prisma.correo.findMany()).map((c) => c.estado)).toEqual(['enviado', 'enviado']);
  });

  it('caso contrario: con el tope global lleno, uno de hace más de una hora queda fallido con el motivo y no sale', async () => {
    const { cerrar } = await pendientesColgados();
    try {
      await prisma.correo.updateMany({ data: { creadoEn: new Date(Date.now() - 2 * 3_600_000) } });
      await prisma.correo.createMany({ data: Array.from({ length: 200 }, () => ({ tipo: 'aviso_mensaje_contacto' as const, para: 'x@x.test', estado: 'enviado' as const })) });
      await arrancarCorreos(new Date());
      expect(escritos()).toHaveLength(0);
      const filas = await prisma.correo.findMany({ where: { NOT: { para: 'x@x.test' } } });
      expect(filas.map((c) => [c.estado, c.error])).toEqual([
        ['fallido', 'Se alcanzó el tope de correos por hora'],
        ['fallido', 'Se alcanzó el tope de correos por hora'],
      ]);
    } finally {
      await cerrar();
    }
  });

  it('caso contrario: uno creado después de arrancar no se toca', async () => {
    const arranque = new Date(Date.now() - 60_000);
    const { cerrar } = await pendientesColgados();
    try {
      await arrancarCorreos(arranque);
      expect(escritos()).toHaveLength(0);
      expect((await prisma.correo.findMany()).map((c) => c.estado)).toEqual(['pendiente', 'pendiente']);
    } finally {
      await cerrar();
    }
  });
});

describe('aceptar con el total como número', () => {
  it.each([[2801], ['2801'], [2801.0], ['2801.004']])('acepta el total %s normalizado a centavos', async (total) => {
    const { cookie, numero } = await clienteConfirmadoConCotizacion();
    await cotizar(numero);
    const res = await app.inject({ method: 'POST', url: `/api/cotizaciones/mias/${numero}/aceptar`, headers: { cookie }, payload: { total } });
    expect(res.statusCode).toBe(200);
  });

  it.each([['abc'], [-1], ['2.801,00'], [true]])('caso contrario: %s no es un monto y responde 400', async (total) => {
    const { cookie, numero } = await clienteConfirmadoConCotizacion();
    await cotizar(numero);
    const res = await app.inject({ method: 'POST', url: `/api/cotizaciones/mias/${numero}/aceptar`, headers: { cookie }, payload: { total } });
    expect(res.statusCode).toBe(400);
    expect((await prisma.cotizacion.findUniqueOrThrow({ where: { numero } })).estado).toBe('cotizada');
  });
});
