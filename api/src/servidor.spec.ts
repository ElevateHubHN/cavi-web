import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from './server.js';
import { prisma } from './shared/prisma.js';
import { buzon, correosEscritos, crearCliente, esperarCorreos, formulario, limpiarBase, solicitudDePrueba } from './testing/db.js';

let app: FastifyInstance;

beforeEach(async () => {
  await limpiarBase();
});

describe('servidor', () => {
  beforeAll(async () => {
    app = await buildServer({ limitesPorIp: false, transporteCorreo: buzon });
  });
  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health responde 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('una ruta que no existe responde 404 en JSON', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/no-existe' });
    expect(res.statusCode).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.json().error.code).toBe('not_found');
  });

  it('un cuerpo JSON de más de 32 KB responde 413', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/contacto', payload: { nombre: 'x', correo: 'a@b.test', telefono: '1', mensaje: 'x'.repeat(33 * 1024) } });
    expect(res.statusCode).toBe(413);
    expect(await prisma.mensajeContacto.count()).toBe(0);
  });

  it('un error no controlado no muestra el detalle', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/contacto', payload: '{no es json', headers: { 'content-type': 'application/json' } });
    expect(res.statusCode).toBe(400);
    expect(res.body).not.toMatch(/Unexpected token|SyntaxError/);
  });
});

describe('contacto y boletín', () => {
  beforeAll(async () => {
    app = await buildServer({ limitesPorIp: false, transporteCorreo: buzon });
  });
  afterAll(async () => {
    await app.close();
  });

  it('el mensaje de contacto queda guardado y avisa a CAVI con respuesta al cliente', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/contacto',
      payload: { nombre: 'Ana Castillo', empresa: 'Fletes del Norte', correo: 'acastillo@fletes.test', telefono: '+504 9900-1122', mensaje: '¿Tienen turbo para Cascadia 2016?' },
    });
    expect(res.statusCode).toBe(201);
    expect(await prisma.mensajeContacto.count()).toBe(1);
    expect(buzon.mensajes).toHaveLength(1);
    expect(buzon.mensajes[0]).toMatchObject({ para: 'avisos@cavi.example', responderA: 'acastillo@fletes.test' });
    expect(buzon.mensajes[0]?.texto).toContain('¿Tienen turbo para Cascadia 2016?');
  });

  it('el contenido del cliente va escapado en el HTML del aviso', async () => {
    await app.inject({ method: 'POST', url: '/api/contacto', payload: { nombre: '<b>x</b>', correo: 'a@b.test', telefono: '1', mensaje: '<script>alert(1)</script>' } });
    await esperarCorreos();
    expect(buzon.mensajes[0]?.html).not.toContain('<script>');
    expect(buzon.mensajes[0]?.html).toContain('&lt;script&gt;');
  });

  it('un mensaje sin texto o con correo inválido responde 400 y no guarda nada', async () => {
    const vacio = await app.inject({ method: 'POST', url: '/api/contacto', payload: { nombre: 'Ana', correo: 'a@b.test', telefono: '1', mensaje: '   ' } });
    const malo = await app.inject({ method: 'POST', url: '/api/contacto', payload: { nombre: 'Ana', correo: 'no-es-correo', telefono: '1', mensaje: 'hola' } });
    expect([vacio.statusCode, malo.statusCode]).toEqual([400, 400]);
    expect(await prisma.mensajeContacto.count()).toBe(0);
    expect(buzon.mensajes).toHaveLength(0);
  });

  it('caso contrario del tope global: los fallidos, los omitidos y los de hace más de una hora no cuentan', async () => {
    const hace2h = new Date(Date.now() - 2 * 3_600_000);
    const fila = (estado: 'enviado' | 'fallido' | 'omitido', creadoEn?: Date) => ({ tipo: 'aviso_mensaje_contacto' as const, para: 'x@x.test', estado, ...(creadoEn ? { creadoEn } : {}) });
    await prisma.correo.createMany({
      data: [
        ...Array.from({ length: 199 }, () => fila('enviado')),
        ...Array.from({ length: 50 }, () => fila('fallido')),
        ...Array.from({ length: 50 }, () => fila('omitido')),
        ...Array.from({ length: 50 }, () => fila('enviado', hace2h)),
      ],
    });
    const res = await app.inject({ method: 'POST', url: '/api/contacto', payload: { nombre: 'Ana', correo: 'a@b.test', telefono: '1', mensaje: 'hola' } });
    expect(res.statusCode).toBe(201);
    expect(await correosEscritos()).toHaveLength(1);
  });

  it('con el tope global alcanzado el mensaje se guarda y responde igual, pero el aviso queda fallido y no sale', async () => {
    await prisma.correo.createMany({ data: Array.from({ length: 200 }, () => ({ tipo: 'aviso_mensaje_contacto' as const, para: 'x@x.test', estado: 'enviado' as const })) });
    const res = await app.inject({ method: 'POST', url: '/api/contacto', payload: { nombre: 'Ana', correo: 'a@b.test', telefono: '1', mensaje: 'hola' } });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ ok: true });
    expect(await prisma.mensajeContacto.count()).toBe(1);
    expect(await correosEscritos()).toHaveLength(0);
    const aviso = await prisma.correo.findFirstOrThrow({ where: { para: 'avisos@cavi.example' } });
    expect(aviso).toMatchObject({ estado: 'fallido', error: 'Se alcanzó el tope de correos por hora' });
  });

  it('el boletín guarda el correo una sola vez', async () => {
    const a = await app.inject({ method: 'POST', url: '/api/boletin', payload: { correo: 'lector@cliente.test' } });
    const b = await app.inject({ method: 'POST', url: '/api/boletin', payload: { correo: ' Lector@Cliente.TEST ' } });
    expect([a.statusCode, b.statusCode]).toEqual([200, 200]);
    expect(b.json()).toEqual(a.json());
    expect(await prisma.suscriptor.count()).toBe(1);
    const malo = await app.inject({ method: 'POST', url: '/api/boletin', payload: { correo: 'x' } });
    expect(malo.statusCode).toBe(400);
  });
});

describe('límites por IP', () => {
  beforeAll(async () => {
    app = await buildServer({ transporteCorreo: buzon });
  });
  afterAll(async () => {
    await app.close();
  });

  const contacto = (ip: string) =>
    app.inject({ method: 'POST', url: '/api/contacto', remoteAddress: ip, payload: { nombre: 'Ana', correo: 'a@b.test', telefono: '1', mensaje: 'hola' } });

  it('el sexto mensaje de contacto de la misma IP en una hora responde 429; otra IP sigue pudiendo', async () => {
    for (let i = 0; i < 5; i++) expect((await contacto('10.0.0.1')).statusCode).toBe(201);
    const sexto = await contacto('10.0.0.1');
    expect(sexto.statusCode).toBe(429);
    expect(sexto.json().error.code).toBe('rate_limited');
    expect(await prisma.mensajeContacto.count()).toBe(5);
    expect((await contacto('10.0.0.2')).statusCode).toBe(201);
  });

  it('el undécimo intento de ingreso de la misma IP en 15 minutos responde 429, aunque la clave sea correcta', async () => {
    const { clave } = await crearCliente({ correo: 'cuenta@cliente.test' });
    for (let i = 0; i < 10; i++) {
      const r = await app.inject({ method: 'POST', url: '/api/auth/ingresar', remoteAddress: '10.0.0.3', payload: { correo: 'cuenta@cliente.test', clave: 'mala-clave' } });
      expect(r.statusCode).toBe(401);
    }
    const bien = await app.inject({ method: 'POST', url: '/api/auth/ingresar', remoteAddress: '10.0.0.3', payload: { correo: 'cuenta@cliente.test', clave } });
    expect(bien.statusCode).toBe(429);
  });

  it('la undécima solicitud de cotización de la misma IP en una hora responde 429 y no se guarda', async () => {
    for (let i = 0; i < 10; i++) {
      const f = formulario(solicitudDePrueba());
      const r = await app.inject({ method: 'POST', url: '/api/cotizaciones', remoteAddress: '10.0.0.4', payload: f.payload, headers: f.headers });
      expect(r.statusCode).toBe(201);
    }
    const f = formulario(solicitudDePrueba());
    const r = await app.inject({ method: 'POST', url: '/api/cotizaciones', remoteAddress: '10.0.0.4', payload: f.payload, headers: f.headers });
    expect(r.statusCode).toBe(429);
    expect(r.json().error.code).toBe('rate_limited');
    expect(await prisma.cotizacion.count()).toBe(10);
  });

  it('olvidé mi clave y reenviar confirmación comparten un límite de 10 por hora por IP; otra IP sigue pudiendo', async () => {
    const pedirCorreo = (ruta: string, ip: string) => app.inject({ method: 'POST', url: `/api/auth/${ruta}`, remoteAddress: ip, payload: { correo: 'nadie@cliente.test' } });
    for (let i = 0; i < 5; i++) {
      expect((await pedirCorreo('olvide-clave', '10.0.0.6')).statusCode).toBe(200);
      expect((await pedirCorreo('reenviar-confirmacion', '10.0.0.6')).statusCode).toBe(200);
    }
    expect((await pedirCorreo('olvide-clave', '10.0.0.6')).statusCode).toBe(429);
    expect((await pedirCorreo('reenviar-confirmacion', '10.0.0.6')).statusCode).toBe(429);
    expect((await pedirCorreo('reenviar-confirmacion', '10.0.0.7')).statusCode).toBe(200);
  });

  it('a la solicitud rechazada número 31 de la misma IP en una hora responde 429; otra IP sigue pudiendo', async () => {
    const invalida = (ip: string) => {
      const f = formulario(solicitudDePrueba({ piezas: [] }));
      return app.inject({ method: 'POST', url: '/api/cotizaciones', remoteAddress: ip, payload: f.payload, headers: f.headers });
    };
    for (let i = 0; i < 30; i++) expect((await invalida('10.0.0.8')).statusCode).toBe(400);
    expect((await invalida('10.0.0.8')).statusCode).toBe(429);
    expect((await invalida('10.0.0.9')).statusCode).toBe(400);
  });

  it('las solicitudes rechazadas por datos inválidos no cuentan para el límite de cotizaciones', async () => {
    for (let i = 0; i < 12; i++) {
      const f = formulario(solicitudDePrueba({ piezas: [] }));
      const r = await app.inject({ method: 'POST', url: '/api/cotizaciones', remoteAddress: '10.0.0.5', payload: f.payload, headers: f.headers });
      expect(r.statusCode).toBe(400);
    }
    const f = formulario(solicitudDePrueba());
    const r = await app.inject({ method: 'POST', url: '/api/cotizaciones', remoteAddress: '10.0.0.5', payload: f.payload, headers: f.headers });
    expect(r.statusCode).toBe(201);
  });
});
