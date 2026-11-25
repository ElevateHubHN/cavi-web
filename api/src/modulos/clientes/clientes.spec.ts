import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../server.js';
import { prisma } from '../../shared/prisma.js';
import {
  buzon,
  claveTemporalDe,
  cookieDe,
  correosEscritos,
  crearCliente,
  formulario,
  ingresarComo,
  limpiarBase,
  solicitudDePrueba,
  tokenDe,
} from '../../testing/db.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildServer({ limitesPorIp: false, transporteCorreo: buzon });
});
afterAll(async () => {
  await app.close();
});
beforeEach(async () => {
  await limpiarBase();
});

const CORREO = 'lourdes@transportes.test';

async function pedir(datos: unknown, cookie?: string) {
  const f = formulario(datos);
  return app.inject({ method: 'POST', url: '/api/cotizaciones', payload: f.payload, headers: { ...f.headers, ...(cookie ? { cookie } : {}) } });
}

async function correoDeCuenta() {
  const lista = (await correosEscritos()).filter((c) => c.para.includes(CORREO));
  const ultimo = lista.at(-1);
  if (!ultimo) throw new Error('no llegó el correo de cuenta');
  return { token: tokenDe(ultimo), clave: claveTemporalDe(ultimo), correo: ultimo };
}

const confirmar = (token: string) => app.inject({ method: 'POST', url: '/api/auth/confirmar', payload: { token } });
const ingresar = (correo: string, clave: string) => app.inject({ method: 'POST', url: '/api/auth/ingresar', payload: { correo, clave } });

describe('confirmar el correo', () => {
  it('el token del correo marca la cuenta confirmada', async () => {
    await pedir(solicitudDePrueba());
    const { token } = await correoDeCuenta();
    const res = await confirmar(token);
    expect(res.statusCode).toBe(200);
    expect((await prisma.cliente.findUniqueOrThrow({ where: { correo: CORREO } })).correoConfirmado).toBe(true);
  });

  it('un token ya usado responde enlace no válido', async () => {
    await pedir(solicitudDePrueba());
    const { token } = await correoDeCuenta();
    expect((await confirmar(token)).statusCode).toBe(200);
    const otraVez = await confirmar(token);
    expect(otraVez.statusCode).toBe(400);
    expect(otraVez.json().error.code).toBe('enlace_no_valido');
  });

  it('un token vencido (más de 24 h) responde enlace no válido y no confirma', async () => {
    await pedir(solicitudDePrueba());
    const { token } = await correoDeCuenta();
    await prisma.tokenCliente.updateMany({ data: { venceEn: new Date(Date.now() - 1000) } });
    const res = await confirmar(token);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('enlace_no_valido');
    expect((await prisma.cliente.findUniqueOrThrow({ where: { correo: CORREO } })).correoConfirmado).toBe(false);
  });

  it.each([['inventado', 'a'.repeat(64)], ['con otro formato', 'no-es-un-token'], ['vacío', '']])('un token %s responde enlace no válido y no cambia nada', async (_caso, token) => {
    await pedir(solicitudDePrueba());
    const res = await confirmar(token);
    expect(res.statusCode).toBe(400);
    expect((await prisma.cliente.findUniqueOrThrow({ where: { correo: CORREO } })).correoConfirmado).toBe(false);
    expect(await prisma.tokenCliente.count({ where: { usadoEn: { not: null } } })).toBe(0);
  });
});

describe('ingresar', () => {
  it('con la clave temporal entra, pero obliga a crear la clave: mientras tanto mis cotizaciones responde 403', async () => {
    await pedir(solicitudDePrueba());
    const { token, clave } = await correoDeCuenta();
    await confirmar(token);
    const res = await ingresar(CORREO, clave);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, debeCambiarClave: true });
    const cookie = cookieDe(res);
    expect(String(res.headers['set-cookie'])).toMatch(/HttpOnly/i);
    expect(String(res.headers['set-cookie'])).toMatch(/SameSite=Lax/i);

    const bloqueada = await app.inject({ method: 'GET', url: '/api/cotizaciones/mias', headers: { cookie } });
    expect(bloqueada.statusCode).toBe(403);
    expect(bloqueada.json().error.code).toBe('debe_cambiar_clave');
    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    expect(me.json()).toMatchObject({ correo: CORREO, debeCambiarClave: true });

    const igual = await app.inject({ method: 'POST', url: '/api/me/clave', headers: { cookie }, payload: { nueva: clave } });
    expect(igual.statusCode).toBe(400);
    const corta = await app.inject({ method: 'POST', url: '/api/me/clave', headers: { cookie }, payload: { nueva: 'corta' } });
    expect(corta.statusCode).toBe(400);
    expect((await prisma.cliente.findUniqueOrThrow({ where: { correo: CORREO } })).claveHash).toBeNull();

    const creada = await app.inject({ method: 'POST', url: '/api/me/clave', headers: { cookie }, payload: { nueva: 'mi-clave-propia' } });
    expect(creada.statusCode).toBe(200);
    const nueva = cookieDe(creada);
    const lista = await app.inject({ method: 'GET', url: '/api/cotizaciones/mias', headers: { cookie: nueva } });
    expect(lista.statusCode).toBe(200);
    expect(lista.json().cotizaciones).toHaveLength(1);
    expect((await ingresar(CORREO, clave)).statusCode).toBe(401);
    expect((await ingresar(CORREO, 'mi-clave-propia')).json()).toEqual({ ok: true, debeCambiarClave: false });
  });

  it('una clave incorrecta y un correo inexistente dan la misma respuesta', async () => {
    await crearCliente({ correo: CORREO, clave: 'clave-correcta-1' });
    const mala = await ingresar(CORREO, 'clave-equivocada');
    const nadie = await ingresar('nadie@cliente.test', 'clave-equivocada');
    expect(mala.statusCode).toBe(401);
    expect(nadie.statusCode).toBe(401);
    expect(mala.body).toBe(nadie.body);
    expect(mala.headers['set-cookie']).toBeUndefined();
  });

  it('con correo sin confirmar y la clave correcta pide confirmar; con la clave incorrecta responde como siempre', async () => {
    await pedir(solicitudDePrueba());
    const { clave } = await correoDeCuenta();
    const bien = await ingresar(CORREO, clave);
    expect(bien.statusCode).toBe(403);
    expect(bien.json().error.code).toBe('correo_sin_confirmar');
    expect(bien.headers['set-cookie']).toBeUndefined();
    const mal = await ingresar(CORREO, 'otra-clave-1');
    expect(mal.statusCode).toBe(401);
  });

  it('salir borra la cookie', async () => {
    const { clave } = await crearCliente({ correo: CORREO });
    await ingresarComo(app, CORREO, clave);
    const res = await app.inject({ method: 'POST', url: '/api/auth/salir' });
    expect(String(res.headers['set-cookie'])).toMatch(/cavi_cliente=;/);
  });
});

describe('Mis datos y clave', () => {
  it('cambia la clave con la actual correcta y la sesión anterior deja de valer', async () => {
    const { clave } = await crearCliente({ correo: CORREO, clave: 'clave-vieja-1' });
    const cookie = await ingresarComo(app, CORREO, clave);
    const mal = await app.inject({ method: 'POST', url: '/api/me/clave', headers: { cookie }, payload: { actual: 'no-es-esta', nueva: 'clave-nueva-1' } });
    expect(mal.statusCode).toBe(400);
    expect(mal.json().error.code).toBe('clave_actual_incorrecta');
    expect((await ingresar(CORREO, 'clave-vieja-1')).statusCode).toBe(200);

    const bien = await app.inject({ method: 'POST', url: '/api/me/clave', headers: { cookie }, payload: { actual: 'clave-vieja-1', nueva: 'clave-nueva-1' } });
    expect(bien.statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: cookieDe(bien) } })).statusCode).toBe(200);
    expect((await ingresar(CORREO, 'clave-vieja-1')).statusCode).toBe(401);
  });

  it('PATCH /api/me cambia los datos de contacto; un dato inválido no guarda nada', async () => {
    const { clave } = await crearCliente({ correo: CORREO });
    const cookie = await ingresarComo(app, CORREO, clave);
    const bien = await app.inject({ method: 'PATCH', url: '/api/me', headers: { cookie }, payload: { telefono: '+504 2222-3333', empresa: '' } });
    expect(bien.statusCode).toBe(200);
    expect(bien.json()).toMatchObject({ telefono: '+504 2222-3333', empresa: null, correo: CORREO });
    const mal = await app.inject({ method: 'PATCH', url: '/api/me', headers: { cookie }, payload: { nombre: '', telefono: '+504 0000-0000' } });
    expect(mal.statusCode).toBe(400);
    const correoNo = await app.inject({ method: 'PATCH', url: '/api/me', headers: { cookie }, payload: { correo: 'otro@cliente.test' } });
    expect(correoNo.statusCode).toBe(400);
    const cuenta = await prisma.cliente.findUniqueOrThrow({ where: { correo: CORREO } });
    expect(cuenta.telefono).toBe('+504 2222-3333');
    expect(cuenta.nombre).toBe('Cliente de Prueba');
  });

  it('PATCH /api/me con clave temporal responde 403 y sin sesión 401', async () => {
    const { clave } = await crearCliente({ correo: CORREO, debeCambiarClave: true });
    const cookie = await ingresarComo(app, CORREO, clave);
    expect((await app.inject({ method: 'PATCH', url: '/api/me', headers: { cookie }, payload: { telefono: '1' } })).statusCode).toBe(403);
    expect((await app.inject({ method: 'PATCH', url: '/api/me', payload: { telefono: '1' } })).statusCode).toBe(401);
  });
});

describe('última entrega', () => {
  it('trae el modo y la sucursal de la última, y la última dirección de envío; otro cliente no la ve', async () => {
    const { clave } = await crearCliente({ correo: CORREO });
    const cookie = await ingresarComo(app, CORREO, clave);
    const vacia = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    expect(vacia.json().ultimaEntrega).toBeNull();

    const envio = { modo: 'envio', departamento: 'Yoro', ciudad: 'El Progreso', direccion: 'Km 3 carretera a Tela', referencia: 'Portón gris' };
    await pedir(solicitudDePrueba({ entrega: envio }), cookie);
    await pedir(solicitudDePrueba({ entrega: { modo: 'retiro', sucursal: 'Sucursal La Laguna · Tegucigalpa' } }), cookie);
    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    expect(me.json().ultimaEntrega).toEqual({
      numero: 'CT-1043',
      modo: 'retiro',
      sucursal: 'Sucursal La Laguna · Tegucigalpa',
      ultimoEnvio: { departamento: 'Yoro', ciudad: 'El Progreso', direccion: 'Km 3 carretera a Tela', referencia: 'Portón gris' },
    });

    const otro = await crearCliente({ correo: 'ajeno@cliente.test' });
    const ajena = await ingresarComo(app, 'ajeno@cliente.test', otro.clave);
    const suya = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: ajena } });
    expect(suya.json().ultimaEntrega).toBeNull();
    expect(suya.body).not.toContain('Tela');
  });
});

describe('olvidé mi clave y reenviar confirmación', () => {
  it('a una cuenta confirmada le manda una clave temporal; la clave actual sigue funcionando hasta que se usa la temporal', async () => {
    await crearCliente({ correo: CORREO, clave: 'clave-vieja-1' });
    const res = await app.inject({ method: 'POST', url: '/api/auth/olvide-clave', payload: { correo: CORREO } });
    expect(res.json()).toEqual({ ok: true });
    const { clave, correo } = await correoDeCuenta();
    expect(correo.asunto).toBe('Tu clave temporal para entrar al portal de CAVI');
    expect((await ingresar(CORREO, 'clave-vieja-1')).json()).toEqual({ ok: true, debeCambiarClave: false });

    await app.inject({ method: 'POST', url: '/api/auth/olvide-clave', payload: { correo: CORREO } });
    const otra = await correoDeCuenta();
    const entra = await ingresar(CORREO, otra.clave);
    expect(entra.json()).toEqual({ ok: true, debeCambiarClave: true });
    expect((await ingresar(CORREO, 'clave-vieja-1')).statusCode).toBe(401);
    expect((await ingresar(CORREO, otra.clave)).json()).toEqual({ ok: true, debeCambiarClave: true });
    expect(clave).not.toBe(otra.clave);
  });

  it('la clave temporal vencida (más de 24 h) no sirve y la actual sigue igual', async () => {
    await crearCliente({ correo: CORREO, clave: 'clave-vieja-1' });
    await app.inject({ method: 'POST', url: '/api/auth/olvide-clave', payload: { correo: CORREO } });
    const { clave } = await correoDeCuenta();
    await prisma.tokenCliente.updateMany({ where: { tipo: 'clave_temporal' }, data: { venceEn: new Date(Date.now() - 1000) } });
    expect((await ingresar(CORREO, clave)).statusCode).toBe(401);
    expect((await ingresar(CORREO, 'clave-vieja-1')).statusCode).toBe(200);
  });

  it('a un correo que no existe responde igual y no manda nada', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/olvide-clave', payload: { correo: 'nadie@cliente.test' } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(await correosEscritos()).toHaveLength(0);
    const reenvio = await app.inject({ method: 'POST', url: '/api/auth/reenviar-confirmacion', payload: { correo: 'nadie@cliente.test' } });
    expect(reenvio.json()).toEqual({ ok: true });
    expect(await correosEscritos()).toHaveLength(0);
  });

  it('a una cuenta sin confirmar le manda otra vez la confirmación', async () => {
    await pedir(solicitudDePrueba());
    await app.inject({ method: 'POST', url: '/api/auth/olvide-clave', payload: { correo: CORREO } });
    const { token, correo } = await correoDeCuenta();
    expect(correo.asunto).toContain('Confirma tu correo');
    expect((await confirmar(token)).statusCode).toBe(200);
  });

  it('a una cuenta confirmada, reenviar confirmación no manda nada', async () => {
    await crearCliente({ correo: CORREO });
    await app.inject({ method: 'POST', url: '/api/auth/reenviar-confirmacion', payload: { correo: CORREO } });
    expect(await correosEscritos()).toHaveLength(0);
  });
});

describe('tope de correos de cuenta por dirección', () => {
  it('las tres primeras en una hora mandan correo; la cuarta responde igual, no manda y queda anotada', async () => {
    await pedir(solicitudDePrueba());
    for (let i = 0; i < 2; i++) {
      const r = await app.inject({ method: 'POST', url: '/api/auth/reenviar-confirmacion', payload: { correo: CORREO } });
      expect(r.json()).toEqual({ ok: true });
    }
    expect((await correosEscritos()).filter((c) => c.para.includes(CORREO))).toHaveLength(3);
    const ultimo = await correoDeCuenta();

    const cuarta = await app.inject({ method: 'POST', url: '/api/auth/reenviar-confirmacion', payload: { correo: CORREO } });
    expect(cuarta.statusCode).toBe(200);
    expect(cuarta.json()).toEqual({ ok: true });
    expect((await correosEscritos()).filter((c) => c.para.includes(CORREO))).toHaveLength(3);
    expect(await prisma.correo.count({ where: { para: CORREO, estado: 'omitido' } })).toBe(1);

    const otraSolicitud = await pedir(solicitudDePrueba());
    expect(otraSolicitud.statusCode).toBe(201);
    expect(otraSolicitud.json()).toEqual({ numero: 'CT-1043', correo: expect.any(String) });
    expect((await correosEscritos()).filter((c) => c.para.includes(CORREO))).toHaveLength(3);
    expect(await prisma.correo.count({ where: { para: CORREO, estado: 'omitido' } })).toBe(2);

    expect((await confirmar(ultimo.token)).statusCode).toBe(200);
  });

  it('pasada la hora vuelve a mandar', async () => {
    await pedir(solicitudDePrueba());
    await app.inject({ method: 'POST', url: '/api/auth/reenviar-confirmacion', payload: { correo: CORREO } });
    await app.inject({ method: 'POST', url: '/api/auth/reenviar-confirmacion', payload: { correo: CORREO } });
    await prisma.correo.updateMany({ data: { creadoEn: new Date(Date.now() - 3_601_000) } });
    await app.inject({ method: 'POST', url: '/api/auth/reenviar-confirmacion', payload: { correo: CORREO } });
    expect((await correosEscritos()).filter((c) => c.para.includes(CORREO))).toHaveLength(4);
  });
});

describe('mismo trabajo exista o no la cuenta', () => {
  it.each(['olvide-clave', 'reenviar-confirmacion'])('%s hace el mismo trabajo de bcrypt con un correo inexistente, uno sin confirmar y uno confirmado', async (ruta) => {
    await crearCliente({ correo: 'pendiente@cliente.test', confirmado: false });
    await crearCliente({ correo: 'confirmado@cliente.test', confirmado: true });
    const hash = vi.spyOn(bcrypt, 'hash');
    const compare = vi.spyOn(bcrypt, 'compare');
    try {
      const trabajo: Record<string, number> = {};
      for (const correo of ['nadie@cliente.test', 'pendiente@cliente.test', 'confirmado@cliente.test']) {
        hash.mockClear();
        compare.mockClear();
        const res = await app.inject({ method: 'POST', url: `/api/auth/${ruta}`, payload: { correo } });
        expect(res.json()).toEqual({ ok: true });
        trabajo[correo] = hash.mock.calls.length + compare.mock.calls.length;
      }
      // Las claves temporales se guardan con su huella, sin bcrypt: ninguno de los tres caminos lo usa.
      expect(trabajo).toEqual({ 'nadie@cliente.test': 0, 'pendiente@cliente.test': 0, 'confirmado@cliente.test': 0 });
    } finally {
      hash.mockRestore();
      compare.mockRestore();
    }
  });

  it('un ingreso fallido hace un solo bcrypt exista o no la cuenta, aunque tenga claves temporales vigentes', async () => {
    await crearCliente({ correo: 'confirmado@cliente.test', confirmado: true });
    for (let i = 0; i < 3; i++) await app.inject({ method: 'POST', url: '/api/auth/olvide-clave', payload: { correo: 'confirmado@cliente.test' } });
    const hash = vi.spyOn(bcrypt, 'hash');
    const compare = vi.spyOn(bcrypt, 'compare');
    try {
      const trabajo: Record<string, number> = {};
      for (const correo of ['nadie@cliente.test', 'confirmado@cliente.test']) {
        hash.mockClear();
        compare.mockClear();
        const res = await app.inject({ method: 'POST', url: '/api/auth/ingresar', payload: { correo, clave: 'no-es-ninguna-1' } });
        expect(res.statusCode).toBe(401);
        trabajo[correo] = hash.mock.calls.length + compare.mock.calls.length;
      }
      expect(trabajo).toEqual({ 'nadie@cliente.test': 1, 'confirmado@cliente.test': 1 });
    } finally {
      hash.mockRestore();
      compare.mockRestore();
    }
  });
});
