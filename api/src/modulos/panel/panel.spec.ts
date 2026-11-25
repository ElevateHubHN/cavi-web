import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance, InjectOptions } from 'fastify';
import { buildServer } from '../../server.js';
import { prisma } from '../../shared/prisma.js';
import type { Transporte } from '../../correos/transporte.js';
import {
  CLAVE_ASESOR,
  buzon,
  claveTemporalDe,
  cookieDe,
  correosEscritos,
  crearAsesor,
  crearCliente,
  esperarCorreos,
  formulario,
  ingresarAlPanel,
  ingresarComo,
  jpegDe,
  limpiarBase,
  solicitudDePrueba,
  tokenDe,
} from '../../testing/db.js';
import { celdaCsv } from './csv.js';
import { cancelarPorCliente, quitarFotoPorAntiguedad } from '../../dominio/cotizaciones.js';
import { reintentarPendientes } from '../../correos/correos.js';
import { limitePorUsuario } from './limites.js';

const smtp = { cae: false };
const transporte: Transporte = {
  async enviar(m) {
    if (smtp.cae) throw new Error('SMTP caído');
    await buzon.enviar(m);
  },
};

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildServer({ limitesPorIp: false, transporteCorreo: transporte });
});
afterAll(async () => {
  await app.close();
});
beforeEach(async () => {
  smtp.cae = false;
  await limpiarBase();
});

type Metodo = NonNullable<InjectOptions['method']>;
const pedir = (method: Metodo, url: string, cookie?: string, payload?: object) =>
  app.inject({ method, url, ...(cookie ? { headers: { cookie } } : {}), ...(payload !== undefined ? { payload } : {}) });

async function solicitud(extra: Record<string, unknown> = {}, foto?: Parameters<typeof formulario>[1]): Promise<number> {
  const f = formulario(solicitudDePrueba(extra), foto);
  const res = await app.inject({ method: 'POST', url: '/api/cotizaciones', payload: f.payload, headers: f.headers });
  expect(res.statusCode).toBe(201);
  // Los correos de la solicitud salen después de responder: se espera a que salgan.
  await esperarCorreos();
  return Number(String(res.json().numero).replace('CT-', ''));
}

async function asesorConSesion(datos: Parameters<typeof crearAsesor>[0] = {}) {
  const usuario = await crearAsesor(datos);
  return { usuario, cookie: await ingresarAlPanel(app, usuario.correo) };
}

const piezasDe = async (numero: number) =>
  prisma.cotizacionItem.findMany({ where: { cotizacion: { numero } }, orderBy: { orden: 'asc' }, select: { id: true, cantidad: true } });

async function preciosPara(numero: number, valores: (string | null)[]) {
  const items = await piezasDe(numero);
  return items.map((i, k) => ({ itemId: i.id, precioUnitario: valores[k] ?? null }));
}

const correosAlCliente = async (para = 'lourdes@transportes.test') => (await correosEscritos()).filter((c) => c.para === para);

describe('sesión del panel', () => {
  it('un asesor ingresa: cookie cavi_panel solo para la API del panel, y /me lo devuelve sin la clave', async () => {
    const asesor = await crearAsesor({ correo: 'karla@repcavi.test' });
    const res = await pedir('POST', '/api/panel/ingresar', undefined, { correo: 'Karla@RepCavi.test', clave: CLAVE_ASESOR });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ usuario: { id: asesor.id, nombre: 'Karla Mejía', correo: 'karla@repcavi.test', rol: 'asesor', activo: true, debeCambiarClave: false } });
    const linea = String(([] as unknown[]).concat(res.headers['set-cookie']).find((l) => String(l).startsWith('cavi_panel=')));
    expect(linea).toMatch(/HttpOnly/i);
    expect(linea).toMatch(/Path=\/api\/panel/);
    expect(linea).toMatch(/SameSite=Strict/i);
    const me = await pedir('GET', '/api/panel/me', cookieDe(res, 'cavi_panel'));
    expect(me.statusCode).toBe(200);
    expect(me.body).not.toContain('claveHash');
  });

  it('clave incorrecta, correo inexistente y usuario desactivado responden lo mismo: 401', async () => {
    await crearAsesor({ correo: 'karla@repcavi.test' });
    await crearAsesor({ correo: 'denia@repcavi.test', activo: false });
    const respuestas = await Promise.all([
      pedir('POST', '/api/panel/ingresar', undefined, { correo: 'karla@repcavi.test', clave: 'otra-clave-123' }),
      pedir('POST', '/api/panel/ingresar', undefined, { correo: 'nadie@repcavi.test', clave: CLAVE_ASESOR }),
      pedir('POST', '/api/panel/ingresar', undefined, { correo: 'denia@repcavi.test', clave: CLAVE_ASESOR }),
    ]);
    expect(respuestas.map((r) => r.statusCode)).toEqual([401, 401, 401]);
    expect(new Set(respuestas.map((r) => r.body)).size).toBe(1);
    expect(respuestas.every((r) => !cookieDe(r, 'cavi_panel'))).toBe(true);
  });

  it.each([
    ['GET', '/api/panel/me'],
    ['GET', '/api/panel/resumen'],
    ['GET', '/api/panel/cotizaciones'],
    ['GET', '/api/panel/cotizaciones/1042'],
    ['PUT', '/api/panel/cotizaciones/1042/precios'],
    ['POST', '/api/panel/cotizaciones/1042/estado'],
    ['POST', '/api/panel/cotizaciones/1042/reenviar-aviso'],
    ['GET', '/api/panel/cotizaciones/1042/foto'],
    ['GET', '/api/panel/clientes'],
    ['GET', '/api/panel/mensajes'],
    ['GET', '/api/panel/boletin'],
    ['GET', '/api/panel/boletin.csv'],
    ['GET', '/api/panel/usuarios'],
    ['POST', '/api/panel/usuarios'],
  ] as const)('%s %s sin cookie de panel responde 401', async (metodo, url) => {
    const res = await pedir(metodo, url, undefined, metodo === 'GET' ? undefined : {});
    expect(res.statusCode).toBe(401);
  });

  it('la cookie de un cliente no abre el panel, ni la del panel abre el portal', async () => {
    const { clave } = await crearCliente({ correo: 'cliente@cliente.test' });
    const cookieCliente = await ingresarComo(app, 'cliente@cliente.test', clave);
    const tokenCliente = cookieCliente.split('=')[1] ?? '';
    const { cookie: cookiePanel } = await asesorConSesion();
    const tokenPanel = cookiePanel.split('=')[1] ?? '';

    expect((await pedir('GET', '/api/panel/cotizaciones', cookieCliente)).statusCode).toBe(401);
    expect((await pedir('GET', '/api/panel/cotizaciones', `cavi_panel=${tokenCliente}`)).statusCode).toBe(401);
    expect((await pedir('GET', '/api/me', cookiePanel)).statusCode).toBe(401);
    expect((await pedir('GET', '/api/me', `cavi_cliente=${tokenPanel}`)).statusCode).toBe(401);
    expect((await pedir('GET', '/api/cotizaciones/mias', `cavi_cliente=${tokenPanel}`)).statusCode).toBe(401);
    // Cada cookie sigue funcionando en su propia API.
    expect((await pedir('GET', '/api/me', cookieCliente)).statusCode).toBe(200);
    expect((await pedir('GET', '/api/panel/me', cookiePanel)).statusCode).toBe(200);
  });

  it('con la clave temporal solo puede ver sus datos, cambiar la clave y salir; lo demás responde 403', async () => {
    const { cookie } = await asesorConSesion({ debeCambiarClave: true });
    expect((await pedir('GET', '/api/panel/me', cookie)).json().debeCambiarClave).toBe(true);
    for (const [metodo, url] of [
      ['GET', '/api/panel/cotizaciones'],
      ['GET', '/api/panel/resumen'],
      ['GET', '/api/panel/clientes'],
      ['GET', '/api/panel/boletin.csv'],
    ] as const) {
      const res = await pedir(metodo, url, cookie);
      expect(res.statusCode, url).toBe(403);
      expect(res.json().error.code).toBe('debe_cambiar_clave');
    }
    const igual = await pedir('POST', '/api/panel/me/clave', cookie, { nueva: CLAVE_ASESOR });
    expect(igual.statusCode).toBe(400);
    const corta = await pedir('POST', '/api/panel/me/clave', cookie, { nueva: 'corta' });
    expect(corta.statusCode).toBe(400);

    const cambio = await pedir('POST', '/api/panel/me/clave', cookie, { nueva: 'mi-clave-propia-1' });
    expect(cambio.statusCode).toBe(200);
    const nueva = cookieDe(cambio, 'cavi_panel');
    expect((await pedir('GET', '/api/panel/cotizaciones', nueva)).statusCode).toBe(200);
    expect((await pedir('GET', '/api/panel/cotizaciones', cookie)).statusCode).toBe(401);
    expect((await pedir('POST', '/api/panel/salir', undefined, {})).statusCode).toBe(200);
  });

  it('cambiar la clave propia exige la actual', async () => {
    const { cookie } = await asesorConSesion();
    expect((await pedir('POST', '/api/panel/me/clave', cookie, { nueva: 'mi-clave-propia-1' })).statusCode).toBe(400);
    expect((await pedir('POST', '/api/panel/me/clave', cookie, { actual: 'no-es-esta-1', nueva: 'mi-clave-propia-1' })).statusCode).toBe(400);
    expect((await pedir('POST', '/api/panel/me/clave', cookie, { actual: CLAVE_ASESOR, nueva: 'mi-clave-propia-1' })).statusCode).toBe(200);
  });

  it('salir borra la cookie del panel', async () => {
    const { cookie } = await asesorConSesion();
    const res = await pedir('POST', '/api/panel/salir', cookie, {});
    expect(res.statusCode).toBe(200);
    expect(String(([] as unknown[]).concat(res.headers['set-cookie']).find((l) => String(l).startsWith('cavi_panel=')))).toMatch(/cavi_panel=;/);
  });
});

describe('lista de cotizaciones', () => {
  it('filtra por estado y sucursal, con contadores por pestaña que no dependen del estado elegido', async () => {
    const { usuario, cookie } = await asesorConSesion();
    const a = await solicitud();
    await solicitud({ entrega: { modo: 'retiro', sucursal: 'Sucursal El Progreso · El Progreso, Yoro' } });
    await solicitud({ entrega: { modo: 'envio', departamento: 'Atlántida', ciudad: 'La Ceiba', direccion: 'Col. El Sauce' } });
    await pedir('POST', `/api/panel/cotizaciones/${a}/estado`, cookie, { accion: 'tomar' });

    const todas = (await pedir('GET', '/api/panel/cotizaciones', cookie)).json();
    expect(todas.total).toBe(3);
    expect(todas.porPagina).toBe(50);
    expect(todas.contadores).toMatchObject({ recibida: 2, en_revision: 1, cotizada: 0, todas: 3 });

    const enRevision = (await pedir('GET', '/api/panel/cotizaciones?estado=en_revision', cookie)).json();
    expect(enRevision.filas.map((f: { numero: number }) => f.numero)).toEqual([a]);
    expect(enRevision.filas[0]).toMatchObject({ asesor: 'Karla Mejía', piezas: 2, total: null, cliente: { nombre: 'Lourdes Paz', empresa: 'Transportes Paz' } });
    expect(enRevision.contadores.todas).toBe(3);

    const matriz = (await pedir('GET', `/api/panel/cotizaciones?sucursal=${encodeURIComponent('Casa Matriz · San Pedro Sula')}`, cookie)).json();
    expect(matriz.total).toBe(1);
    expect(matriz.contadores).toMatchObject({ en_revision: 1, recibida: 0, todas: 1 });
    const envio = (await pedir('GET', '/api/panel/cotizaciones?sucursal=envio', cookie)).json();
    expect(envio.filas.map((f: { entrega: { ciudad: string } }) => f.entrega.ciudad)).toEqual(['La Ceiba']);

    expect((await pedir('GET', '/api/panel/cotizaciones?asesor=yo', cookie)).json().total).toBe(1);
    expect((await pedir('GET', `/api/panel/cotizaciones?asesor=${usuario.id}`, cookie)).json().total).toBe(1);
    expect((await pedir('GET', '/api/panel/cotizaciones?asesor=ninguno', cookie)).json().total).toBe(2);
    expect((await pedir('GET', '/api/panel/cotizaciones?estado=inventado', cookie)).statusCode).toBe(400);
  });

  it('busca por número, nombre, empresa o correo', async () => {
    const { cookie } = await asesorConSesion();
    await solicitud();
    await solicitud({ nombre: 'Óscar Rivera', empresa: 'Agrícola Rivera', correo: 'orivera@agricola.test' });
    const buscar = async (q: string) => (await pedir('GET', `/api/panel/cotizaciones?q=${encodeURIComponent(q)}`, cookie)).json().filas.map((f: { numero: number }) => f.numero);
    expect(await buscar('CT-1043')).toEqual([1043]);
    expect(await buscar('1042')).toEqual([1042]);
    expect(await buscar('rivera')).toEqual([1043]);
    expect(await buscar('Transportes')).toEqual([1042]);
    expect(await buscar('ORIVERA@')).toEqual([1043]);
    expect(await buscar('nadie')).toEqual([]);
  });

  it('pagina de a 50', async () => {
    const { cookie } = await asesorConSesion();
    const { cliente } = await crearCliente();
    await prisma.cotizacion.createMany({
      data: Array.from({ length: 51 }, () => ({ clienteId: cliente.id, nombre: 'X', telefono: '1', modoEntrega: 'retiro' as const, sucursal: 'Casa Matriz' })),
    });
    const p1 = (await pedir('GET', '/api/panel/cotizaciones', cookie)).json();
    const p2 = (await pedir('GET', '/api/panel/cotizaciones?pagina=2', cookie)).json();
    expect([p1.filas.length, p2.filas.length, p1.total]).toEqual([50, 1, 51]);
  });

  it('el detalle trae piezas, contacto con el correo de la cuenta, bitácora y correos; una que no existe responde 404', async () => {
    const { cookie } = await asesorConSesion();
    const n = await solicitud();
    const d = (await pedir('GET', `/api/panel/cotizaciones/${n}`, cookie)).json();
    expect(d).toMatchObject({
      numero: n,
      estado: 'recibida',
      asesor: null,
      contacto: { nombre: 'Lourdes Paz', correo: 'lourdes@transportes.test', rtn: '08011999123456' },
      entrega: { modo: 'retiro', sucursal: 'Casa Matriz · San Pedro Sula', direccion: null },
      conFoto: false,
      total: null,
    });
    expect(d.piezas).toHaveLength(2);
    expect(d.piezas[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(d.bitacora).toEqual([expect.objectContaining({ de: null, a: 'recibida', usuario: null, canal: 'sistema' })]);
    expect(d.correos.map((c: { tipo: string }) => c.tipo).sort()).toEqual(['aviso_solicitud_nueva', 'confirmacion']);
    expect((await pedir('GET', '/api/panel/cotizaciones/99999', cookie)).statusCode).toBe(404);
    expect((await pedir('GET', '/api/panel/cotizaciones/abc', cookie)).statusCode).toBe(404);
  });
});

describe('precios y envío de la cotización', () => {
  it('enviar con todas las piezas con precio la deja cotizada, con el total redondeado, y manda un correo al cliente', async () => {
    const { usuario, cookie } = await asesorConSesion();
    const n = await solicitud();
    buzon.vaciar();
    const res = await pedir('PUT', `/api/panel/cotizaciones/${n}/precios`, cookie, { precios: await preciosPara(n, ['1250.50', '99.99']), enviar: true });
    expect(res.statusCode).toBe(200);
    const d = res.json();
    expect(d).toMatchObject({ estado: 'cotizada', cotizadaPor: 'sistema', total: 2600.99, asesor: { id: usuario.id, nombre: 'Karla Mejía' } });
    expect(d.bitacora[0]).toMatchObject({ de: 'recibida', a: 'cotizada', usuario: 'Karla Mejía', canal: 'sistema' });

    const alCliente = await correosAlCliente();
    expect(alCliente).toHaveLength(1);
    expect(alCliente[0]?.asunto).toBe(`Tu cotización CT-${n} está lista: L 2,600.99`);
    expect(await prisma.correo.count({ where: { tipo: 'cotizacion_lista', estado: 'enviado' } })).toBe(1);
  });

  it.each([
    ['falta un precio', [null, '10']],
    ['un precio en 0', ['0', '10']],
    ['un precio negativo', ['-5', '10']],
    ['un precio con tres decimales', ['10.005', '10']],
    ['un precio que no es número', ['diez', '10']],
  ])('con %s responde 400, el estado no cambia y no se escribe ningún correo', async (_caso, valores) => {
    const { cookie } = await asesorConSesion();
    const n = await solicitud();
    buzon.vaciar();
    const res = await pedir('PUT', `/api/panel/cotizaciones/${n}/precios`, cookie, { precios: await preciosPara(n, valores), enviar: true });
    expect(res.statusCode).toBe(400);
    const c = await prisma.cotizacion.findUniqueOrThrow({ where: { numero: n }, include: { items: true } });
    expect(c.estado).toBe('recibida');
    expect(c.items.every((i) => i.precioUnitario === null)).toBe(true);
    expect(await correosEscritos()).toHaveLength(0);
  });

  it('un doble envío no manda un segundo correo; corregir solo avisa si se marca «avisar»', async () => {
    const { cookie } = await asesorConSesion();
    const n = await solicitud();
    buzon.vaciar();
    const cuerpo = { precios: await preciosPara(n, ['100', '200']), enviar: true };
    const [r1, r2] = await Promise.all([
      pedir('PUT', `/api/panel/cotizaciones/${n}/precios`, cookie, cuerpo),
      pedir('PUT', `/api/panel/cotizaciones/${n}/precios`, cookie, cuerpo),
    ]);
    expect([r1.statusCode, r2.statusCode]).toEqual([200, 200]);
    expect(await correosAlCliente()).toHaveLength(1);

    const sinAvisar = await pedir('PUT', `/api/panel/cotizaciones/${n}/precios`, cookie, { precios: await preciosPara(n, ['90', '200']), enviar: true });
    expect(sinAvisar.json().total).toBe(380);
    expect(await correosAlCliente()).toHaveLength(1);

    const avisando = await pedir('PUT', `/api/panel/cotizaciones/${n}/precios`, cookie, { precios: await preciosPara(n, ['95', '200']), enviar: true, avisar: true });
    expect(avisando.statusCode).toBe(200);
    const correos = await correosAlCliente();
    expect(correos).toHaveLength(2);
    expect(correos[1]?.asunto).toContain('L 390.00');
  });

  it('guardar sin enviar no cambia el estado ni avisa; con la cotización ya vista por el cliente, no se puede dejar una pieza sin precio', async () => {
    const { cookie } = await asesorConSesion();
    const n = await solicitud();
    buzon.vaciar();
    const guardada = await pedir('PUT', `/api/panel/cotizaciones/${n}/precios`, cookie, { precios: await preciosPara(n, ['100', null]), enviar: false });
    expect(guardada.json()).toMatchObject({ estado: 'recibida', total: 200 });
    await pedir('PUT', `/api/panel/cotizaciones/${n}/precios`, cookie, { precios: await preciosPara(n, ['100', '50']), enviar: true });
    const quitar = await pedir('PUT', `/api/panel/cotizaciones/${n}/precios`, cookie, { precios: await preciosPara(n, ['100', null]), enviar: false });
    expect(quitar.statusCode).toBe(400);
    expect((await prisma.cotizacionItem.findMany({ where: { precioUnitario: null } })).length).toBe(0);
  });

  it('una pieza de otra cotización responde 400', async () => {
    const { cookie } = await asesorConSesion();
    const n = await solicitud();
    const otra = await solicitud();
    const res = await pedir('PUT', `/api/panel/cotizaciones/${n}/precios`, cookie, { precios: await preciosPara(otra, ['10']), enviar: false });
    expect(res.statusCode).toBe(400);
  });
});

describe('estados', () => {
  it('«la envié por fuera» la deja cotizada con el canal, sin precios y sin correos; el cliente la acepta en su portal', async () => {
    const { clave } = await crearCliente({ correo: 'lourdes@transportes.test' });
    const cookieCliente = await ingresarComo(app, 'lourdes@transportes.test', clave);
    const { cookie } = await asesorConSesion();
    const n = await solicitud();
    buzon.vaciar();

    const sinCanal = await pedir('POST', `/api/panel/cotizaciones/${n}/estado`, cookie, { accion: 'fuera' });
    expect(sinCanal.statusCode).toBe(400);
    expect(await prisma.cambioEstado.count()).toBe(1);

    const res = await pedir('POST', `/api/panel/cotizaciones/${n}/estado`, cookie, { accion: 'fuera', canal: 'whatsapp', nota: 'Le mandé la del sistema' });
    expect(res.json()).toMatchObject({ estado: 'cotizada', cotizadaPor: 'whatsapp', total: null });
    expect(res.json().bitacora[0]).toMatchObject({ a: 'cotizada', canal: 'whatsapp', nota: 'Le mandé la del sistema', usuario: 'Karla Mejía' });
    expect(await correosEscritos()).toHaveLength(0);

    const portal = (await pedir('GET', `/api/cotizaciones/mias/CT-${n}`, cookieCliente)).json();
    expect(portal).toMatchObject({ estado: 'cotizada', cotizadaPor: 'whatsapp', total: null });
    const acepta = await pedir('POST', `/api/cotizaciones/mias/CT-${n}/aceptar`, cookieCliente, { total: null });
    expect(acepta.statusCode).toBe(200);
    expect(acepta.json().estado).toBe('confirmada');
    const otraVez = await pedir('POST', `/api/cotizaciones/mias/CT-${n}/aceptar`, cookieCliente, { total: null });
    expect(otraVez.statusCode).toBe(409);
    expect((await correosEscritos()).filter((c) => c.asunto.includes('aceptada'))).toHaveLength(1);
  });

  it('el cliente no puede aceptar una que no está cotizada', async () => {
    const { clave } = await crearCliente({ correo: 'lourdes@transportes.test' });
    const cookieCliente = await ingresarComo(app, 'lourdes@transportes.test', clave);
    const n = await solicitud();
    expect((await pedir('POST', `/api/cotizaciones/mias/CT-${n}/aceptar`, cookieCliente, { total: null })).statusCode).toBe(409);
  });

  it('«cambiar estado» mueve a cualquier estado, también hacia atrás, sin correos y con su fila en la bitácora', async () => {
    const { cookie } = await asesorConSesion();
    const n = await solicitud();
    buzon.vaciar();
    const mover = (cuerpo: object) => pedir('POST', `/api/panel/cotizaciones/${n}/estado`, cookie, cuerpo);
    expect((await mover({ accion: 'cambiar', a: 'entregada', canal: 'tienda', nota: 'Retiró en mostrador' })).json()).toMatchObject({ estado: 'entregada', asesor: { nombre: 'Karla Mejía' } });
    expect((await mover({ accion: 'cambiar', a: 'en_revision', canal: 'llamada' })).json().estado).toBe('en_revision');
    expect((await mover({ accion: 'cancelar', motivo: 'Sin existencia en ninguna sucursal' })).json()).toMatchObject({ estado: 'cancelada', motivoCancelacion: 'Sin existencia en ninguna sucursal' });
    const reactivada = (await mover({ accion: 'cambiar', a: 'recibida', canal: 'whatsapp', nota: 'El cliente volvió a escribir' })).json();
    expect(reactivada).toMatchObject({ estado: 'recibida', motivoCancelacion: null, asesor: null });
    expect(reactivada.bitacora.map((b: { de: string; a: string; canal: string; usuario: string | null }) => [b.de, b.a, b.canal, b.usuario])).toEqual([
      ['cancelada', 'recibida', 'whatsapp', 'Karla Mejía'],
      ['en_revision', 'cancelada', 'sistema', 'Karla Mejía'],
      ['entregada', 'en_revision', 'llamada', 'Karla Mejía'],
      ['recibida', 'entregada', 'tienda', 'Karla Mejía'],
      [null, 'recibida', 'sistema', null],
    ]);
    expect(await correosEscritos()).toHaveLength(0);
  });

  it('casos contrarios: sin canal, sin motivo, con «cancelada» por «cambiar» o con cookie de cliente no cambia nada', async () => {
    const { clave } = await crearCliente({ correo: 'cli@cliente.test' });
    const cookieCliente = await ingresarComo(app, 'cli@cliente.test', clave);
    const { cookie } = await asesorConSesion();
    const n = await solicitud();
    const url = `/api/panel/cotizaciones/${n}/estado`;
    expect((await pedir('POST', url, cookie, { accion: 'cambiar', a: 'entregada' })).statusCode).toBe(400);
    expect((await pedir('POST', url, cookie, { accion: 'cambiar', a: 'entregada', canal: 'sistema' })).statusCode).toBe(400);
    expect((await pedir('POST', url, cookie, { accion: 'cambiar', a: 'cancelada', canal: 'whatsapp' })).statusCode).toBe(400);
    expect((await pedir('POST', url, cookie, { accion: 'cancelar' })).statusCode).toBe(400);
    expect((await pedir('POST', url, cookie, { accion: 'cancelar', motivo: '   ' })).statusCode).toBe(400);
    expect((await pedir('POST', url, cookieCliente, { accion: 'cambiar', a: 'entregada', canal: 'tienda' })).statusCode).toBe(401);
    expect((await pedir('POST', url, cookie, { accion: 'borrar' })).statusCode).toBe(400);
    const c = await prisma.cotizacion.findUniqueOrThrow({ where: { numero: n } });
    expect(c.estado).toBe('recibida');
    expect(await prisma.cambioEstado.count()).toBe(1);
  });

  it('el cliente ve el motivo de la cancelación del asesor', async () => {
    const { clave } = await crearCliente({ correo: 'lourdes@transportes.test' });
    const cookieCliente = await ingresarComo(app, 'lourdes@transportes.test', clave);
    const { cookie } = await asesorConSesion();
    const n = await solicitud();
    await pedir('POST', `/api/panel/cotizaciones/${n}/estado`, cookie, { accion: 'cancelar', motivo: 'Sin existencia en ninguna sucursal' });
    expect((await pedir('GET', `/api/cotizaciones/mias/CT-${n}`, cookieCliente)).json()).toMatchObject({ estado: 'cancelada', motivoCancelacion: 'Sin existencia en ninguna sucursal' });
  });
});

describe('reenviar un correo', () => {
  async function cotizadaConCorreoFallido() {
    const { usuario, cookie } = await asesorConSesion();
    const n = await solicitud();
    smtp.cae = true;
    await pedir('PUT', `/api/panel/cotizaciones/${n}/precios`, cookie, { precios: await preciosPara(n, ['100', '200']), enviar: true });
    await esperarCorreos();
    smtp.cae = false;
    buzon.vaciar();
    const fallido = await prisma.correo.findFirstOrThrow({ where: { tipo: 'cotizacion_lista' } });
    expect(fallido.estado).toBe('fallido');
    return { usuario, cookie, n, fallido };
  }

  it('reenvía el que falló, y un doble clic no manda un segundo correo', async () => {
    const { cookie, n, fallido } = await cotizadaConCorreoFallido();
    const url = `/api/panel/cotizaciones/${n}/reenviar-aviso`;
    const [a, b] = await Promise.all([pedir('POST', url, cookie, { correoId: fallido.id }), pedir('POST', url, cookie, { correoId: fallido.id })]);
    expect([a.statusCode, b.statusCode].sort()).toEqual([200, 409]);
    expect(await correosAlCliente()).toHaveLength(1);
    expect((await correosAlCliente())[0]?.asunto).toContain('L 400.00');
    const despues = (await pedir('GET', `/api/panel/cotizaciones/${n}`, cookie)).json();
    expect(despues.correos.filter((c: { tipo: string; estado: string }) => c.tipo === 'cotizacion_lista').map((c: { estado: string }) => c.estado)).toEqual(['enviado', 'reemplazado']);
  });

  it('un correo ya enviado o de otra cotización no se reenvía', async () => {
    const { cookie } = await asesorConSesion();
    const n = await solicitud();
    const otra = await solicitud({ correo: 'otro@cliente.test' });
    const enviado = await prisma.correo.findFirstOrThrow({ where: { tipo: 'aviso_solicitud_nueva', cotizacion: { numero: n } } });
    const ajeno = await prisma.correo.findFirstOrThrow({ where: { tipo: 'aviso_solicitud_nueva', cotizacion: { numero: otra } } });
    expect((await pedir('POST', `/api/panel/cotizaciones/${n}/reenviar-aviso`, cookie, { correoId: enviado.id })).statusCode).toBe(409);
    expect((await pedir('POST', `/api/panel/cotizaciones/${n}/reenviar-aviso`, cookie, { correoId: ajeno.id })).statusCode).toBe(404);
  });

  it('como máximo 3 correos del mismo tipo por hora para una cotización', async () => {
    const { cookie, n, fallido } = await cotizadaConCorreoFallido();
    const c = await prisma.cotizacion.findUniqueOrThrow({ where: { numero: n } });
    const antes = new Date(fallido.creadoEn.getTime() - 60_000);
    await prisma.correo.createMany({
      data: [1, 2, 3].map(() => ({ tipo: 'cotizacion_lista' as const, para: 'lourdes@transportes.test', cotizacionId: c.id, estado: 'enviado' as const, creadoEn: antes })),
    });
    const res = await pedir('POST', `/api/panel/cotizaciones/${n}/reenviar-aviso`, cookie, { correoId: fallido.id });
    expect(res.statusCode).toBe(429);
    expect(await correosAlCliente()).toHaveLength(0);
  });

  it('reenvía el aviso a CAVI que no salió, con los datos de la solicitud', async () => {
    const { cookie } = await asesorConSesion();
    smtp.cae = true;
    const n = await solicitud();
    await esperarCorreos();
    smtp.cae = false;
    buzon.vaciar();
    const aviso = await prisma.correo.findFirstOrThrow({ where: { tipo: 'aviso_solicitud_nueva' } });
    const res = await pedir('POST', `/api/panel/cotizaciones/${n}/reenviar-aviso`, cookie, { correoId: aviso.id });
    expect(res.statusCode).toBe(200);
    const escritos = await correosEscritos();
    expect(escritos.map((c) => [c.para, c.asunto.startsWith(`Solicitud nueva CT-${n}`)])).toEqual([['avisos@cavi.example', true]]);
  });

  it('la confirmación que no llegó se reenvía con enlace y clave nuevos; si el cliente ya confirmó, no', async () => {
    const { cookie } = await asesorConSesion();
    smtp.cae = true;
    const n = await solicitud();
    await esperarCorreos();
    smtp.cae = false;
    buzon.vaciar();
    const conf = await prisma.correo.findFirstOrThrow({ where: { tipo: 'confirmacion' } });
    const res = await pedir('POST', `/api/panel/cotizaciones/${n}/reenviar-aviso`, cookie, { correoId: conf.id });
    expect(res.statusCode).toBe(200);
    const alCliente = await correosAlCliente();
    expect(alCliente).toHaveLength(1);
    expect(claveTemporalDe(alCliente[0] ?? { para: '', asunto: '', contenido: '' })).toHaveLength(10);
    expect(res.body).not.toContain(claveTemporalDe(alCliente[0] ?? { para: '', asunto: '', contenido: '' }));

    await prisma.cliente.updateMany({ data: { correoConfirmado: true } });
    await prisma.correo.update({ where: { id: conf.id }, data: { estado: 'fallido' } });
    expect((await pedir('POST', `/api/panel/cotizaciones/${n}/reenviar-aviso`, cookie, { correoId: conf.id })).statusCode).toBe(409);
  });
});

describe('foto del vehículo', () => {
  it('solo se ve con sesión de panel', async () => {
    const { cookie } = await asesorConSesion();
    const { clave } = await crearCliente({ correo: 'lourdes@transportes.test' });
    const cookieCliente = await ingresarComo(app, 'lourdes@transportes.test', clave);
    const foto = jpegDe(4096);
    const n = await solicitud({}, { nombre: 'cabezal.jpg', tipo: 'image/jpeg', contenido: foto });
    const sinFoto = await solicitud();
    const url = `/api/panel/cotizaciones/${n}/foto`;

    expect((await pedir('GET', url)).statusCode).toBe(401);
    expect((await pedir('GET', url, cookieCliente)).statusCode).toBe(401);
    const res = await pedir('GET', url, cookie);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(Buffer.compare(res.rawPayload, foto)).toBe(0);
    expect((await pedir('GET', `/api/panel/cotizaciones/${sinFoto}/foto`, cookie)).statusCode).toBe(404);
    expect((await pedir('GET', '/api/panel/cotizaciones/99999/foto', cookie)).statusCode).toBe(404);
  });
});

describe('clientes, mensajes y resumen', () => {
  it('lista clientes con búsqueda y abre uno con sus cotizaciones', async () => {
    const { cookie } = await asesorConSesion();
    await solicitud();
    await solicitud();
    await solicitud({ nombre: 'Óscar Rivera', empresa: null, correo: 'orivera@agricola.test' });
    const lista = (await pedir('GET', '/api/panel/clientes?q=transportes', cookie)).json();
    expect(lista).toMatchObject({ total: 1, porPagina: 50 });
    expect(lista.filas[0]).toMatchObject({ correo: 'lourdes@transportes.test', cotizaciones: 2 });
    const uno = (await pedir('GET', `/api/panel/clientes/${lista.filas[0].id}`, cookie)).json();
    expect(uno.cotizaciones.map((c: { numero: number }) => c.numero)).toEqual([1043, 1042]);
    expect(uno).not.toHaveProperty('claveHash');
    expect((await pedir('GET', '/api/panel/clientes/00000000-0000-4000-8000-000000000000', cookie)).statusCode).toBe(404);
    expect((await pedir('GET', '/api/panel/clientes/abc', cookie)).statusCode).toBe(404);
  });

  it('un mensaje se marca atendido una vez: el segundo no cambia quién lo atendió', async () => {
    const karla = await asesorConSesion();
    const luis = await asesorConSesion({ nombre: 'Luis Fiallos' });
    await pedir('POST', '/api/contacto', undefined, { nombre: 'Ricardo', correo: 'r@x.test', telefono: '3311', mensaje: 'Horario del sábado' });
    const { pendientes } = (await pedir('GET', '/api/panel/mensajes', karla.cookie)).json();
    expect(pendientes).toHaveLength(1);
    expect((await pedir('GET', '/api/panel/resumen', karla.cookie)).json()).toEqual({ recibidas: 0, mensajesPendientes: 1 });
    const primero = await pedir('POST', `/api/panel/mensajes/${pendientes[0].id}/atendido`, karla.cookie, {});
    expect(primero.json()).toMatchObject({ atendidoPor: 'Karla Mejía' });
    const segundo = await pedir('POST', `/api/panel/mensajes/${pendientes[0].id}/atendido`, luis.cookie, {});
    expect(segundo.json()).toMatchObject({ atendidoPor: 'Karla Mejía', atendidoEn: primero.json().atendidoEn });
    const despues = (await pedir('GET', '/api/panel/mensajes', karla.cookie)).json();
    expect([despues.pendientes.length, despues.atendidos.length]).toEqual([0, 1]);
    expect((await pedir('POST', '/api/panel/mensajes/00000000-0000-4000-8000-000000000000/atendido', karla.cookie, {})).statusCode).toBe(404);
  });
});

describe('boletín', () => {
  it('el CSV trae todos los suscriptores, sin repetidos', async () => {
    const { cookie } = await asesorConSesion();
    for (const correo of ['ana@x.test', 'ANA@x.test ', 'beto@x.test']) await pedir('POST', '/api/boletin', undefined, { correo });
    expect((await pedir('GET', '/api/panel/boletin', cookie)).json()).toEqual({ suscriptores: 2 });
    const res = await pedir('GET', '/api/panel/boletin.csv', cookie);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    const lineas = res.body.trim().split('\r\n');
    expect(lineas[0]).toBe('"correo","fecha de alta"');
    expect(lineas.slice(1).map((l) => l.split(',')[0]).sort()).toEqual(['"ana@x.test"', '"beto@x.test"']);
  });

  it('un dato que empieza con =, +, - o @ sale como texto y no como fórmula', async () => {
    const { cookie } = await asesorConSesion();
    const peligrosos = ['=HYPERLINK("http://x")@a.test', '+1@a.test', '-2@a.test', '@x@a.test'];
    await prisma.suscriptor.createMany({ data: peligrosos.map((correo) => ({ correo })) });
    const cuerpo = (await pedir('GET', '/api/panel/boletin.csv', cookie)).body;
    expect(cuerpo).toContain(`"'=HYPERLINK(""http://x"")@a.test"`);
    expect(cuerpo).toContain(`"'+1@a.test"`);
    expect(cuerpo).toContain(`"'-2@a.test"`);
    expect(cuerpo).toContain(`"'@x@a.test"`);
    expect(cuerpo).not.toMatch(/(^|,|\r\n)"[=+\-@]/);
  });

  it('celdaCsv deja igual lo seguro y comilla todo', () => {
    expect(celdaCsv('ana@x.test')).toBe('"ana@x.test"');
    expect(celdaCsv('a"b')).toBe('"a""b"');
    expect(celdaCsv('\tx')).toBe(`"'\tx"`);
  });
});

describe('usuarios del panel', () => {
  it('un asesor recibe 403 en todo lo de usuarios', async () => {
    const { cookie } = await asesorConSesion();
    const otro = await crearAsesor();
    expect((await pedir('GET', '/api/panel/usuarios', cookie)).statusCode).toBe(403);
    expect((await pedir('POST', '/api/panel/usuarios', cookie, { nombre: 'X', correo: 'x@repcavi.test', rol: 'admin' })).statusCode).toBe(403);
    expect((await pedir('PATCH', `/api/panel/usuarios/${otro.id}`, cookie, { activo: false })).statusCode).toBe(403);
    expect(await prisma.usuario.count()).toBe(2);
    expect((await prisma.usuario.findUniqueOrThrow({ where: { id: otro.id } })).activo).toBe(true);
  });

  it('un admin crea un asesor con clave temporal y bienvenida; la respuesta no trae la clave y el nuevo debe cambiarla', async () => {
    const { cookie } = await asesorConSesion({ rol: 'admin', nombre: 'Ana Admin' });
    buzon.vaciar();
    const res = await pedir('POST', '/api/panel/usuarios', cookie, { nombre: 'Luis Fiallos', correo: 'LFiallos@repcavi.test', rol: 'asesor' });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ nombre: 'Luis Fiallos', correo: 'lfiallos@repcavi.test', rol: 'asesor', activo: true, debeCambiarClave: true, bienvenida: 'pendiente' });
    const [bienvenida] = await correosEscritos();
    expect(bienvenida?.para).toBe('lfiallos@repcavi.test');
    const clave = bienvenida ? claveTemporalDe(bienvenida) : '';
    expect(clave).toHaveLength(10);
    expect(res.body).not.toContain(clave);
    const entra = await pedir('POST', '/api/panel/ingresar', undefined, { correo: 'lfiallos@repcavi.test', clave });
    expect(entra.json().usuario.debeCambiarClave).toBe(true);

    const repetido = await pedir('POST', '/api/panel/usuarios', cookie, { nombre: 'Otro', correo: 'lfiallos@repcavi.test', rol: 'asesor' });
    expect(repetido.statusCode).toBe(409);
    const lista = (await pedir('GET', '/api/panel/usuarios', cookie)).json();
    expect(lista.filas.map((u: { correo: string }) => u.correo).sort()).toEqual([expect.stringMatching(/@repcavi\.test$/), 'lfiallos@repcavi.test']);
  });

  it('un doble clic al crear deja un solo usuario y un solo correo', async () => {
    const { cookie } = await asesorConSesion({ rol: 'admin' });
    buzon.vaciar();
    const cuerpo = { nombre: 'Luis', correo: 'luis@repcavi.test', rol: 'asesor' };
    const r = await Promise.all([pedir('POST', '/api/panel/usuarios', cookie, cuerpo), pedir('POST', '/api/panel/usuarios', cookie, cuerpo)]);
    expect(r.map((x) => x.statusCode).sort()).toEqual([201, 409]);
    expect(await prisma.usuario.count({ where: { correo: 'luis@repcavi.test' } })).toBe(1);
    expect(await correosEscritos()).toHaveLength(1);
  });

  it('desactivar a un usuario le corta la sesión en el acto y ya no puede ingresar', async () => {
    const admin = await asesorConSesion({ rol: 'admin' });
    const asesor = await asesorConSesion();
    expect((await pedir('GET', '/api/panel/cotizaciones', asesor.cookie)).statusCode).toBe(200);
    const res = await pedir('PATCH', `/api/panel/usuarios/${asesor.usuario.id}`, admin.cookie, { activo: false });
    expect(res.json()).toMatchObject({ activo: false });
    expect((await pedir('GET', '/api/panel/cotizaciones', asesor.cookie)).statusCode).toBe(401);
    expect((await pedir('POST', '/api/panel/ingresar', undefined, { correo: asesor.usuario.correo, clave: CLAVE_ASESOR })).statusCode).toBe(401);
  });

  it('un admin no puede desactivarse ni quitarse el rol; el panel nunca queda sin un admin activo', async () => {
    const a = await asesorConSesion({ rol: 'admin', nombre: 'Ana' });
    const b = await asesorConSesion({ rol: 'admin', nombre: 'Bea' });
    expect((await pedir('PATCH', `/api/panel/usuarios/${a.usuario.id}`, a.cookie, { activo: false })).statusCode).toBe(409);
    expect((await pedir('PATCH', `/api/panel/usuarios/${a.usuario.id}`, a.cookie, { rol: 'asesor' })).statusCode).toBe(409);

    // Cada una intenta quitarle el rol a la otra a la vez: queda una sola admin activa.
    const r = await Promise.all([
      pedir('PATCH', `/api/panel/usuarios/${b.usuario.id}`, a.cookie, { rol: 'asesor' }),
      pedir('PATCH', `/api/panel/usuarios/${a.usuario.id}`, b.cookie, { rol: 'asesor' }),
    ]);
    expect(r.map((x) => x.statusCode).filter((s) => s === 200)).toHaveLength(1);
    expect(await prisma.usuario.count({ where: { rol: 'admin', activo: true } })).toBe(1);
  });

  it('una clave temporal nueva manda la bienvenida, corta las sesiones abiertas, y el doble clic no manda dos', async () => {
    const admin = await asesorConSesion({ rol: 'admin' });
    const asesor = await asesorConSesion();
    buzon.vaciar();
    const url = `/api/panel/usuarios/${asesor.usuario.id}`;
    const r = await Promise.all([pedir('PATCH', url, admin.cookie, { claveTemporalNueva: true }), pedir('PATCH', url, admin.cookie, { claveTemporalNueva: true })]);
    expect(r.map((x) => x.statusCode).sort()).toEqual([200, 409]);
    expect(await correosEscritos()).toHaveLength(1);
    expect((await pedir('GET', '/api/panel/cotizaciones', asesor.cookie)).statusCode).toBe(401);
    const clave = claveTemporalDe((await correosEscritos())[0] ?? { para: '', asunto: '', contenido: '' });
    expect((await pedir('POST', '/api/panel/ingresar', undefined, { correo: asesor.usuario.correo, clave })).json().usuario.debeCambiarClave).toBe(true);
  });

  it('como máximo 3 correos de bienvenida por hora al mismo destinatario', async () => {
    const admin = await asesorConSesion({ rol: 'admin' });
    const asesor = await crearAsesor();
    const hace10min = new Date(Date.now() - 600_000);
    await prisma.correo.createMany({ data: [1, 2, 3].map(() => ({ tipo: 'bienvenida_usuario_panel' as const, para: asesor.correo, estado: 'enviado' as const, creadoEn: hace10min })) });
    buzon.vaciar();
    const res = await pedir('PATCH', `/api/panel/usuarios/${asesor.id}`, admin.cookie, { claveTemporalNueva: true });
    expect(res.statusCode).toBe(429);
    expect(await correosEscritos()).toHaveLength(0);
    const sigue = await prisma.usuario.findUniqueOrThrow({ where: { id: asesor.id } });
    expect(sigue.claveHash).toBe(asesor.claveHash);
  });

  it('cada usuario del panel tiene un tope de correos por hora', () => {
    const limite = limitePorUsuario(2, 1000);
    limite.consumir('u1', 0);
    limite.consumir('u1', 10);
    expect(() => limite.consumir('u1', 20)).toThrow(expect.objectContaining({ statusCode: 429 }));
    expect(() => limite.consumir('u2', 20)).not.toThrow();
    expect(() => limite.consumir('u1', 1001)).not.toThrow();
  });
});

describe('precios de borrador y cotizadas por fuera', () => {
  async function clienteConSolicitud() {
    const { clave } = await crearCliente({ correo: 'lourdes@transportes.test' });
    const cookieCliente = await ingresarComo(app, 'lourdes@transportes.test', clave);
    const f = formulario(solicitudDePrueba());
    const res = await app.inject({ method: 'POST', url: '/api/cotizaciones', payload: f.payload, headers: { ...f.headers, cookie: cookieCliente } });
    expect(res.statusCode).toBe(201);
    return { n: Number(String(res.json().numero).replace('CT-', '')), cookieCliente };
  }
  const portal = async (n: number, cookieCliente: string) => (await pedir('GET', `/api/cotizaciones/mias/${n}`, cookieCliente)).json();
  const sinPrecios = (vista: { piezas: { precioUnitario: number | null }[] }) => vista.piezas.every((p) => p.precioUnitario === null);

  it('«cambiar a cotizada» con precios guardados en borrador queda por el canal y el cliente no ve esos precios', async () => {
    const { cookie } = await asesorConSesion();
    const { n, cookieCliente } = await clienteConSolicitud();
    await pedir('PUT', `/api/panel/cotizaciones/${n}/precios`, cookie, { precios: await preciosPara(n, ['22500.25', '45000']), enviar: false });
    buzon.vaciar();
    const res = await pedir('POST', `/api/panel/cotizaciones/${n}/estado`, cookie, { accion: 'cambiar', a: 'cotizada', canal: 'whatsapp' });
    expect(res.statusCode).toBe(200);
    expect(res.json().cotizadaPor).toBe('whatsapp');
    const vista = await portal(n, cookieCliente);
    expect(vista).toMatchObject({ estado: 'cotizada', total: null, cotizadaPor: 'whatsapp' });
    expect(sinPrecios(vista)).toBe(true);
    expect(await correosEscritos()).toHaveLength(0);
  });

  it('una enviada que vuelve a revisión y se corrige en borrador no muestra los precios nuevos al volver a cotizada por fuera', async () => {
    const { cookie } = await asesorConSesion();
    const { n, cookieCliente } = await clienteConSolicitud();
    await pedir('PUT', `/api/panel/cotizaciones/${n}/precios`, cookie, { precios: await preciosPara(n, ['100', '200']), enviar: true });
    expect((await portal(n, cookieCliente)).total).toBe(400);

    await pedir('POST', `/api/panel/cotizaciones/${n}/estado`, cookie, { accion: 'cambiar', a: 'en_revision', canal: 'llamada' });
    expect((await prisma.cotizacion.findUniqueOrThrow({ where: { numero: n } })).cotizadaPor).toBeNull();
    await pedir('PUT', `/api/panel/cotizaciones/${n}/precios`, cookie, { precios: await preciosPara(n, ['999', '999']), enviar: false });
    const res = await pedir('POST', `/api/panel/cotizaciones/${n}/estado`, cookie, { accion: 'cambiar', a: 'cotizada', canal: 'whatsapp' });
    expect(res.json().cotizadaPor).toBe('whatsapp');
    const vista = await portal(n, cookieCliente);
    expect(vista).toMatchObject({ estado: 'cotizada', total: null, cotizadaPor: 'whatsapp' });
    expect(sinPrecios(vista)).toBe(true);
  });

  it('caso contrario: una enviada por el sistema que pasa a confirmada con «cambiar» sigue mostrando el total enviado', async () => {
    const { cookie } = await asesorConSesion();
    const { n, cookieCliente } = await clienteConSolicitud();
    await pedir('PUT', `/api/panel/cotizaciones/${n}/precios`, cookie, { precios: await preciosPara(n, ['100', '200']), enviar: true });
    await pedir('POST', `/api/panel/cotizaciones/${n}/estado`, cookie, { accion: 'cambiar', a: 'confirmada', canal: 'whatsapp' });
    expect(await portal(n, cookieCliente)).toMatchObject({ estado: 'confirmada', total: 400, cotizadaPor: null });
  });
});

describe('correcciones de precios sin cambios', () => {
  it('repetir «enviar» con los mismos precios no agrega correcciones, y «avisar» sin cambios no manda correo', async () => {
    const { cookie } = await asesorConSesion();
    const n = await solicitud();
    const url = `/api/panel/cotizaciones/${n}/precios`;
    await pedir('PUT', url, cookie, { precios: await preciosPara(n, ['100', '200']), enviar: true });
    await esperarCorreos();
    buzon.vaciar();
    const filas = await prisma.cambioEstado.count();
    await pedir('PUT', url, cookie, { precios: await preciosPara(n, ['100', '200.00']), enviar: true });
    await pedir('PUT', url, cookie, { precios: await preciosPara(n, ['100.00', '200']), enviar: true, avisar: true });
    await pedir('PUT', url, cookie, { precios: await preciosPara(n, ['100', '200']), enviar: false });
    expect(await prisma.cambioEstado.count()).toBe(filas);
    expect(await correosAlCliente()).toHaveLength(0);

    const cambio = await pedir('PUT', url, cookie, { precios: await preciosPara(n, ['110', '200']), enviar: true, avisar: true });
    expect(cambio.json().bitacora[0]).toMatchObject({ a: 'cotizada', nota: 'Corrigió los precios' });
    expect(await prisma.cambioEstado.count()).toBe(filas + 1);
    expect(await correosAlCliente()).toHaveLength(1);
  });
});

describe('filtros de la lista', () => {
  it.each(['2026-02-31', '2026-13-01', '2026-00-10'])('la fecha imposible %s en desde o hasta responde 400', async (dia) => {
    const { cookie } = await asesorConSesion();
    for (const campo of ['desde', 'hasta']) {
      const res = await pedir('GET', `/api/panel/cotizaciones?${campo}=${dia}`, cookie);
      expect(res.statusCode, campo).toBe(400);
    }
  });

  it('caso contrario: una fecha válida filtra', async () => {
    const { cookie } = await asesorConSesion();
    await solicitud();
    expect((await pedir('GET', '/api/panel/cotizaciones?desde=2020-02-29&hasta=2999-12-31', cookie)).json().total).toBe(1);
  });
});

describe('usuario con un correo que ya existe', () => {
  it('responde correo_en_uso aunque se le acabe de mandar la bienvenida, y no anota otro correo', async () => {
    const { cookie } = await asesorConSesion({ rol: 'admin' });
    const cuerpo = { nombre: 'Luis', correo: 'luis@repcavi.test', rol: 'asesor' };
    expect((await pedir('POST', '/api/panel/usuarios', cookie, cuerpo)).statusCode).toBe(201);
    const otra = await pedir('POST', '/api/panel/usuarios', cookie, { ...cuerpo, nombre: 'Luis Otro' });
    expect(otra.statusCode).toBe(409);
    expect(otra.json().error.code).toBe('correo_en_uso');
    expect(await prisma.correo.count({ where: { para: 'luis@repcavi.test' } })).toBe(1);
  });
});

describe('boletín ordenado', () => {
  it('el CSV va por fecha de alta y empieza con la marca UTF-8 para que Excel lea bien las tildes', async () => {
    const { cookie } = await asesorConSesion();
    await prisma.suscriptor.createMany({
      data: [
        { correo: 'tercero@x.test', creadoEn: new Date('2026-03-03T12:00:00Z') },
        { correo: 'primero@x.test', creadoEn: new Date('2026-01-01T12:00:00Z') },
        { correo: 'segundo@x.test', creadoEn: new Date('2026-02-02T12:00:00Z') },
      ],
    });
    const res = await pedir('GET', '/api/panel/boletin.csv', cookie);
    expect([...res.rawPayload.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const lineas = res.rawPayload.subarray(3).toString('utf8').trim().split('\r\n');
    expect(lineas).toEqual(['"correo","fecha de alta"', '"primero@x.test","2026-01-01"', '"segundo@x.test","2026-02-02"', '"tercero@x.test","2026-03-03"']);
  });
});

describe('tope global de correos', () => {
  it('con el tope alcanzado la solicitud responde igual, el correo queda fallido con su motivo y se reenvía después', async () => {
    const { cookie } = await asesorConSesion();
    await prisma.correo.createMany({ data: Array.from({ length: 200 }, () => ({ tipo: 'aviso_mensaje_contacto' as const, para: 'x@x.test', estado: 'enviado' as const })) });
    const f = formulario(solicitudDePrueba());
    const res = await app.inject({ method: 'POST', url: '/api/cotizaciones', payload: f.payload, headers: f.headers });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ numero: 'CT-1042', correo: 'lourdes@transportes.test' });
    expect(await correosEscritos()).toHaveLength(0);
    const detalle = (await pedir('GET', '/api/panel/cotizaciones/1042', cookie)).json();
    const aviso = detalle.correos.find((m: { tipo: string }) => m.tipo === 'aviso_solicitud_nueva');
    expect(aviso).toMatchObject({ estado: 'fallido', motivo: 'Se alcanzó el tope de correos por hora' });

    await prisma.correo.deleteMany({ where: { para: 'x@x.test' } });
    const reenvio = await pedir('POST', '/api/panel/cotizaciones/1042/reenviar-aviso', cookie, { correoId: aviso.id });
    expect(reenvio.statusCode).toBe(200);
    expect((await correosEscritos()).map((c) => c.para)).toEqual(['avisos@cavi.example']);
  });
});

describe('correos pendientes', () => {
  const hace = (min: number) => new Date(Date.now() - min * 60_000);

  async function avisoPendiente(minutos: number) {
    const { cookie } = await asesorConSesion();
    const n = await solicitud();
    await esperarCorreos();
    buzon.vaciar();
    const aviso = await prisma.correo.findFirstOrThrow({ where: { tipo: 'aviso_solicitud_nueva' } });
    await prisma.correo.update({ where: { id: aviso.id }, data: { estado: 'pendiente', tomadoEn: null, creadoEn: hace(minutos) } });
    return { cookie, n, aviso };
  }

  it('uno pendiente de hace menos de 5 minutos no se reenvía: está en camino', async () => {
    const { cookie, n, aviso } = await avisoPendiente(2);
    const res = await pedir('POST', `/api/panel/cotizaciones/${n}/reenviar-aviso`, cookie, { correoId: aviso.id });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('en_camino');
    expect(await correosEscritos()).toHaveLength(0);
    const detalle = (await pedir('GET', `/api/panel/cotizaciones/${n}`, cookie)).json();
    expect(detalle.correos.find((m: { id: string }) => m.id === aviso.id)).toMatchObject({ estado: 'pendiente', sePuedeReenviar: false, motivo: null });
  });

  it('uno pendiente de hace más de 5 minutos se puede reenviar', async () => {
    const { cookie, n, aviso } = await avisoPendiente(6);
    const detalle = (await pedir('GET', `/api/panel/cotizaciones/${n}`, cookie)).json();
    expect(detalle.correos.find((m: { id: string }) => m.id === aviso.id)).toMatchObject({ sePuedeReenviar: true });
    const res = await pedir('POST', `/api/panel/cotizaciones/${n}/reenviar-aviso`, cookie, { correoId: aviso.id });
    expect(res.statusCode).toBe(200);
    expect((await correosEscritos()).map((c) => c.para)).toEqual(['avisos@cavi.example']);
  });

  it('al arrancar, un pendiente de antes sin su mensaje guardado queda fallido con su motivo; uno posterior al arranque no se toca', async () => {
    const { cookie, n } = await avisoPendiente(6);
    const reciente = await prisma.correo.create({ data: { tipo: 'aviso_mensaje_contacto', para: 'avisos@cavi.example', estado: 'pendiente', creadoEn: hace(2) } });
    expect(await reintentarPendientes(prisma, transporte, app.log, hace(3))).toEqual({ enviados: 0, fallidos: 1 });
    expect((await prisma.correo.findUniqueOrThrow({ where: { id: reciente.id } })).estado).toBe('pendiente');
    const detalle = (await pedir('GET', `/api/panel/cotizaciones/${n}`, cookie)).json();
    expect(detalle.correos.find((m: { tipo: string }) => m.tipo === 'aviso_solicitud_nueva')).toMatchObject({
      estado: 'fallido',
      motivo: 'No se llegó a enviar: la API se reinició antes de terminar',
      sePuedeReenviar: true,
    });
    expect(await correosEscritos()).toHaveLength(0);
  });

  it('un correo que el servidor de correo rechazó muestra un motivo sin el error técnico', async () => {
    const { cookie } = await asesorConSesion();
    smtp.cae = true;
    const n = await solicitud();
    await esperarCorreos();
    smtp.cae = false;
    const detalle = (await pedir('GET', `/api/panel/cotizaciones/${n}`, cookie)).json();
    expect(detalle.correos.map((m: { motivo: string }) => m.motivo)).toEqual(['El servidor de correo no lo aceptó', 'El servidor de correo no lo aceptó']);
    expect(JSON.stringify(detalle)).not.toContain('SMTP caído');
  });
});

describe('aviso de cancelación después de borrar la foto', () => {
  it('el reenvío sigue diciendo en qué estado estaba cuando el cliente la canceló', async () => {
    const { cookie } = await asesorConSesion();
    const { cliente } = await crearCliente({ correo: 'lourdes@transportes.test' });
    const n = await solicitud({}, { nombre: 'v.jpg', tipo: 'image/jpeg', contenido: jpegDe(1024) });
    await cancelarPorCliente(prisma, { clienteId: cliente.id, numero: n, comentario: 'Ya no' });
    const c = await prisma.cotizacion.findUniqueOrThrow({ where: { numero: n } });
    const viejo = new Date(Date.now() - 400 * 24 * 3600 * 1000);
    await prisma.cotizacion.update({ where: { id: c.id }, data: { creadaEn: viejo } });
    await prisma.cambioEstado.updateMany({ where: { cotizacionId: c.id }, data: { creadoEn: viejo } });
    expect(await quitarFotoPorAntiguedad(prisma, { numero: n, limite: new Date() })).toBe(c.fotoArchivo);
    const fallido = await prisma.correo.create({ data: { tipo: 'aviso_cotizacion_cancelada', para: 'avisos@cavi.example', cotizacionId: c.id, estado: 'fallido' } });
    await esperarCorreos();
    buzon.vaciar();

    const res = await pedir('POST', `/api/panel/cotizaciones/${n}/reenviar-aviso`, cookie, { correoId: fallido.id });
    expect(res.statusCode).toBe(200);
    const [aviso] = await correosEscritos();
    expect(aviso?.contenido).toContain('Recibida');
    expect(aviso?.contenido).not.toContain('Cancelada (');
  });
});

describe('topes que solo cuentan lo que salió', () => {
  it('con el tope global lleno, cuatro solicitudes con un correo nuevo no gastan el tope de la dirección; liberado, el reenvío funciona y la cuenta confirma', async () => {
    const { cookie } = await asesorConSesion();
    await prisma.correo.createMany({ data: Array.from({ length: 200 }, () => ({ tipo: 'aviso_mensaje_contacto' as const, para: 'x@x.test', estado: 'enviado' as const })) });
    const numeros: number[] = [];
    for (let i = 0; i < 4; i++) numeros.push(await solicitud({ correo: 'nuevo@cliente.test' }));
    await esperarCorreos();
    expect(await prisma.correo.count({ where: { para: 'nuevo@cliente.test', estado: 'omitido' } })).toBe(0);
    expect(await prisma.correo.count({ where: { para: 'nuevo@cliente.test', estado: 'fallido' } })).toBe(4);

    await prisma.correo.deleteMany({ where: { para: 'x@x.test' } });
    buzon.vaciar();
    const conf = await prisma.correo.findFirstOrThrow({ where: { tipo: 'confirmacion', cotizacion: { numero: numeros[0] } } });
    const res = await pedir('POST', `/api/panel/cotizaciones/${numeros[0]}/reenviar-aviso`, cookie, { correoId: conf.id });
    expect(res.statusCode).toBe(200);
    const [mail] = await correosAlCliente('nuevo@cliente.test');
    expect(mail).toBeDefined();
    const vacio = { para: '', asunto: '', contenido: '' };
    expect((await pedir('POST', '/api/auth/confirmar', undefined, { token: tokenDe(mail ?? vacio) })).statusCode).toBe(200);
    expect((await pedir('POST', '/api/auth/ingresar', undefined, { correo: 'nuevo@cliente.test', clave: claveTemporalDe(mail ?? vacio) })).statusCode).toBe(200);
  });

  it('los fallidos no cuentan para el tope de 3 por hora de una cotización', async () => {
    const { cookie } = await asesorConSesion();
    smtp.cae = true;
    const n = await solicitud();
    await esperarCorreos();
    smtp.cae = false;
    const c = await prisma.cotizacion.findUniqueOrThrow({ where: { numero: n } });
    const hace10 = new Date(Date.now() - 600_000);
    await prisma.correo.createMany({ data: [1, 2, 3].map(() => ({ tipo: 'aviso_solicitud_nueva' as const, para: 'avisos@cavi.example', cotizacionId: c.id, estado: 'fallido' as const, creadoEn: hace10 })) });
    const aviso = await prisma.correo.findFirstOrThrow({ where: { tipo: 'aviso_solicitud_nueva', cotizacionId: c.id }, orderBy: { creadoEn: 'desc' } });
    buzon.vaciar();
    expect((await pedir('POST', `/api/panel/cotizaciones/${n}/reenviar-aviso`, cookie, { correoId: aviso.id })).statusCode).toBe(200);
  });
});

describe('cuándo se puede reenviar', () => {
  const correoDe = (d: { correos: { id: string }[] }, id: string) => d.correos.find((m) => m.id === id);

  it('un fallido ya reenviado deja de ofrecerse y el servidor no lo reenvía otra vez', async () => {
    const { cookie } = await asesorConSesion();
    smtp.cae = true;
    const n = await solicitud();
    await esperarCorreos();
    smtp.cae = false;
    const aviso = await prisma.correo.findFirstOrThrow({ where: { tipo: 'aviso_solicitud_nueva' } });
    const antes = (await pedir('GET', `/api/panel/cotizaciones/${n}`, cookie)).json();
    expect(correoDe(antes, aviso.id)).toMatchObject({ sePuedeReenviar: true });
    await pedir('POST', `/api/panel/cotizaciones/${n}/reenviar-aviso`, cookie, { correoId: aviso.id });
    await esperarCorreos();
    const despues = (await pedir('GET', `/api/panel/cotizaciones/${n}`, cookie)).json();
    expect(correoDe(despues, aviso.id)).toMatchObject({ estado: 'reemplazado', sePuedeReenviar: false });
  });

  it('un omitido no se ofrece ni se reenvía', async () => {
    const { cookie } = await asesorConSesion();
    const n = await solicitud();
    const c = await prisma.cotizacion.findUniqueOrThrow({ where: { numero: n } });
    const omitido = await prisma.correo.create({ data: { tipo: 'aviso_solicitud_nueva', para: 'avisos@cavi.example', cotizacionId: c.id, estado: 'omitido' } });
    await prisma.correo.deleteMany({ where: { cotizacionId: c.id, NOT: { id: omitido.id } } });
    const d = (await pedir('GET', `/api/panel/cotizaciones/${n}`, cookie)).json();
    expect(correoDe(d, omitido.id)).toMatchObject({ sePuedeReenviar: false });
    expect((await pedir('POST', `/api/panel/cotizaciones/${n}/reenviar-aviso`, cookie, { correoId: omitido.id })).statusCode).toBe(409);
  });

  it('un pendiente de hace más de 5 minutos dice que no se confirmó el envío', async () => {
    const { cookie } = await asesorConSesion();
    const n = await solicitud();
    await esperarCorreos();
    const aviso = await prisma.correo.findFirstOrThrow({ where: { tipo: 'aviso_solicitud_nueva' } });
    await prisma.correo.update({ where: { id: aviso.id }, data: { estado: 'pendiente', tomadoEn: null, creadoEn: new Date(Date.now() - 6 * 60_000) } });
    const d = (await pedir('GET', `/api/panel/cotizaciones/${n}`, cookie)).json();
    expect(correoDe(d, aviso.id)).toMatchObject({ estado: 'pendiente', sePuedeReenviar: true, motivo: 'No se confirmó el envío' });
  });
});

describe('cupo de correos del usuario del panel', () => {
  it('un pedido que responde 409 no gasta el cupo', async () => {
    const admin = await asesorConSesion({ rol: 'admin' });
    const x = await crearAsesor();
    const y = await crearAsesor();
    const url = `/api/panel/usuarios/${x.id}`;
    expect((await pedir('PATCH', url, admin.cookie, { claveTemporalNueva: true })).statusCode).toBe(200);
    for (let i = 0; i < 30; i++) expect((await pedir('PATCH', url, admin.cookie, { claveTemporalNueva: true })).statusCode).toBe(409);
    expect((await pedir('PATCH', `/api/panel/usuarios/${y.id}`, admin.cookie, { claveTemporalNueva: true })).statusCode).toBe(200);
  });
});

describe('fechas del boletín', () => {
  it('la fecha de alta del CSV va en hora de Honduras', async () => {
    const { cookie } = await asesorConSesion();
    await prisma.suscriptor.create({ data: { correo: 'noche@x.test', creadoEn: new Date('2026-01-02T03:00:00Z') } });
    const cuerpo = (await pedir('GET', '/api/panel/boletin.csv', cookie)).body;
    expect(cuerpo).toContain('"noche@x.test","2026-01-01"');
  });
});
