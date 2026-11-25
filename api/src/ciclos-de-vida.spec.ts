import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance, InjectOptions } from 'fastify';
import type { EstadoCorreo, TipoCorreo } from '@prisma/client';
import { buildServer } from './server.js';
import { prisma } from './shared/prisma.js';
import { cifrar } from './correos/sobre.js';
import { MOTIVO_ILEGIBLE, MOTIVO_SIN_ENVIAR, crearCorreos, reintentarPendientes, vaciarEnvios } from './correos/correos.js';
import type { Transporte } from './correos/transporte.js';
import {
  buzon,
  claveTemporalDe,
  cookieDe,
  correosEscritos,
  crearAsesor,
  crearCliente,
  esperarCorreos,
  formulario,
  ingresarAlPanel,
  limpiarBase,
  solicitudDePrueba,
  tokenDe,
  type CorreoEscrito,
} from './testing/db.js';

const CORREO = 'lourdes@transportes.test';
const AVISOS = 'avisos@cavi.example';
const smtp = { cae: false };
const transporte: Transporte = {
  async enviar(m) {
    if (smtp.cae) throw new Error('SMTP caído');
    await buzon.enviar(m);
  },
};

let app: FastifyInstance;

type Metodo = NonNullable<InjectOptions['method']>;
const pedir = (method: Metodo, url: string, cookie?: string, payload?: object) =>
  app.inject({ method, url, ...(cookie ? { headers: { cookie } } : {}), ...(payload !== undefined ? { payload } : {}) });

async function solicitud(extra: Record<string, unknown> = {}): Promise<number> {
  const f = formulario(solicitudDePrueba(extra));
  const res = await app.inject({ method: 'POST', url: '/api/cotizaciones', payload: f.payload, headers: f.headers });
  expect(res.statusCode).toBe(201);
  await esperarCorreos();
  return Number(String(res.json().numero).replace('CT-', ''));
}

const hace = (minutos: number) => new Date(Date.now() - minutos * 60_000);
const ingresar = (clave: string, correo = CORREO) => pedir('POST', '/api/auth/ingresar', undefined, { correo, clave });
const confirmar = (c: CorreoEscrito) => pedir('POST', '/api/auth/confirmar', undefined, { token: tokenDe(c) });
const olvide = () => pedir('POST', '/api/auth/olvide-clave', undefined, { correo: CORREO });
const alCliente = async () => (await correosEscritos()).filter((c) => c.para === CORREO);
const aCavi = () => buzon.mensajes.filter((m) => m.para === AVISOS);

async function ultimoAlCliente(): Promise<CorreoEscrito> {
  const ultimo = (await alCliente()).at(-1);
  if (!ultimo) throw new Error('no llegó ningún correo al cliente');
  return ultimo;
}

async function asesorConSesion(rol: 'admin' | 'asesor' = 'asesor') {
  const usuario = await crearAsesor({ rol });
  return { usuario, cookie: await ingresarAlPanel(app, usuario.correo) };
}

const llenarTopeGlobal = () =>
  prisma.correo.createMany({ data: Array.from({ length: 200 }, () => ({ tipo: 'aviso_mensaje_contacto' as const, para: 'x@x.test', estado: 'enviado' as const })) });
const vaciarTopeGlobal = () => prisma.correo.deleteMany({ where: { para: 'x@x.test' } });

describe('ciclos de vida', () => {
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

  describe('credenciales del cliente', () => {
    it('la clave temporal del primer correo de una cuenta nueva vence a las 24 h, y con ella la sesión que abrió', async () => {
      await solicitud();
      const primero = await ultimoAlCliente();
      expect((await prisma.cliente.findUniqueOrThrow({ where: { correo: CORREO } })).claveHash).toBeNull();
      expect((await confirmar(primero)).statusCode).toBe(200);

      const entra = await ingresar(claveTemporalDe(primero));
      expect(entra.json()).toEqual({ ok: true, debeCambiarClave: true });
      const sesion = cookieDe(entra);
      expect((await pedir('GET', '/api/me', sesion)).statusCode).toBe(200);
      expect((await prisma.cliente.findUniqueOrThrow({ where: { correo: CORREO } })).claveHash).toBeNull();

      await prisma.tokenCliente.updateMany({ data: { venceEn: new Date(Date.now() - 1000) } });
      expect((await ingresar(claveTemporalDe(primero))).statusCode).toBe(401);
      expect((await pedir('GET', '/api/me', sesion)).statusCode).toBe(401);

      await olvide();
      const nueva = await ultimoAlCliente();
      expect(nueva.asunto).toContain('clave temporal');
      expect((await ingresar(claveTemporalDe(nueva))).json()).toEqual({ ok: true, debeCambiarClave: true });
    });

    it('la primera clave de una cuenta nueva entra en el máximo de 3 vigentes: la cuarta la deja sin efecto', async () => {
      for (let i = 0; i < 4; i++) {
        await solicitud();
        await prisma.correo.updateMany({ data: { creadoEn: hace(120) } });
      }
      const correos = await alCliente();
      expect(correos).toHaveLength(4);
      expect(await prisma.tokenCliente.count({ where: { claveHash: { not: null } } })).toBe(3);
      expect((await confirmar(correos[3] as CorreoEscrito)).statusCode).toBe(200);
      expect((await ingresar(claveTemporalDe(correos[0] as CorreoEscrito))).statusCode).toBe(401);
      expect((await ingresar(claveTemporalDe(correos[1] as CorreoEscrito))).statusCode).toBe(200);
    });

    it('entrar con una temporal anula las otras y borra la clave propia; la usada sigue sirviendo hasta crear la propia', async () => {
      await crearCliente({ correo: CORREO, clave: 'mi-clave-propia-1' });
      const propia = cookieDe(await ingresar('mi-clave-propia-1'));
      await olvide();
      const a = claveTemporalDe(await ultimoAlCliente());
      await olvide();
      const b = claveTemporalDe(await ultimoAlCliente());

      const entra = await ingresar(a);
      expect(entra.json()).toEqual({ ok: true, debeCambiarClave: true });
      expect((await ingresar(b)).statusCode).toBe(401);
      expect((await ingresar('mi-clave-propia-1')).statusCode).toBe(401);
      expect((await pedir('GET', '/api/me', propia)).statusCode).toBe(401);
      expect((await ingresar(a)).statusCode).toBe(200);

      const temporal = cookieDe(entra);
      expect((await pedir('POST', '/api/me/clave', temporal, { nueva: a })).json().error.code).toBe('clave_repetida');
      const creada = await pedir('POST', '/api/me/clave', temporal, { nueva: 'otra-clave-propia-2' });
      expect(creada.statusCode).toBe(200);
      expect((await ingresar(a)).statusCode).toBe(401);
      expect((await pedir('GET', '/api/me', temporal)).statusCode).toBe(401);
      expect((await pedir('GET', '/api/me', cookieDe(creada))).json()).toMatchObject({ debeCambiarClave: false });
      expect((await ingresar('otra-clave-propia-2')).json()).toEqual({ ok: true, debeCambiarClave: false });
    });

    it('entrar con la clave propia anula las temporales y no pide cambiarla', async () => {
      await crearCliente({ correo: CORREO, clave: 'mi-clave-propia-1' });
      await olvide();
      const temporal = claveTemporalDe(await ultimoAlCliente());
      expect((await ingresar('mi-clave-propia-1')).json()).toEqual({ ok: true, debeCambiarClave: false });
      expect((await ingresar(temporal)).statusCode).toBe(401);
      expect((await ingresar('mi-clave-propia-1')).statusCode).toBe(200);
    });

    it('una cuenta sin confirmar con la temporal correcta responde 403 y no gasta ni anula nada', async () => {
      await solicitud();
      const primero = await ultimoAlCliente();
      expect((await ingresar(claveTemporalDe(primero))).json().error.code).toBe('correo_sin_confirmar');
      expect(await prisma.tokenCliente.count({ where: { claveHash: { not: null } } })).toBe(1);
      expect((await confirmar(primero)).statusCode).toBe(200);
      expect((await ingresar(claveTemporalDe(primero))).statusCode).toBe(200);
    });

    it('dos ingresos a la vez con dos claves temporales: entra uno y el otro recibe 401, nunca 500', async () => {
      await crearCliente({ correo: CORREO, clave: 'mi-clave-propia-1' });
      for (let ronda = 0; ronda < 8; ronda++) {
        await esperarCorreos();
        buzon.vaciar();
        await prisma.correo.deleteMany();
        await prisma.tokenCliente.deleteMany();
        await olvide();
        await olvide();
        const [a, b] = await alCliente();
        const r = await Promise.all([ingresar(claveTemporalDe(a as CorreoEscrito)), ingresar(claveTemporalDe(b as CorreoEscrito))]);
        expect(r.map((x) => x.statusCode).sort()).toEqual([200, 401]);
      }
    });

    it('la clave propia y una temporal a la vez: entra una sola, y la cuenta queda del lado de la que entró', async () => {
      for (let ronda = 0; ronda < 6; ronda++) {
        await limpiarBase();
        await crearCliente({ correo: CORREO, clave: 'mi-clave-propia-1' });
        await olvide();
        const temporal = claveTemporalDe(await ultimoAlCliente());
        const [conPropia, conTemporal] = await Promise.all([ingresar('mi-clave-propia-1'), ingresar(temporal)]);
        expect([conPropia.statusCode, conTemporal.statusCode].sort()).toEqual([200, 401]);
        const cuenta = await prisma.cliente.findUniqueOrThrow({ where: { correo: CORREO } });
        const vigentes = await prisma.tokenCliente.count({ where: { claveHash: { not: null } } });
        expect({ conClavePropia: cuenta.claveHash !== null, vigentes }).toEqual(
          conPropia.statusCode === 200 ? { conClavePropia: true, vigentes: 0 } : { conClavePropia: false, vigentes: 1 },
        );
      }
    });
  });

  describe('un correo sale una sola vez', () => {
    async function avisoPendienteDeAntes(datos: { tomadoEn?: Date; contenido?: string | null } = {}) {
      const { cookie } = await asesorConSesion();
      const n = await solicitud();
      buzon.vaciar();
      const aviso = await prisma.correo.findFirstOrThrow({ where: { tipo: 'aviso_solicitud_nueva' } });
      const sobre = cifrar({
        tipo: aviso.tipo,
        para: aviso.para,
        cotizacionId: aviso.cotizacionId,
        contenido: { asunto: `Solicitud nueva CT-${n} (guardado)`, html: '<p>guardado</p>', texto: 'guardado', paraCavi: true, nombreRemitente: null },
      });
      await prisma.correo.update({
        where: { id: aviso.id },
        data: { estado: 'pendiente', creadoEn: hace(30), contenido: datos.contenido === undefined ? sobre : datos.contenido, tomadoEn: datos.tomadoEn ?? null },
      });
      return { cookie, n, aviso, url: `/api/panel/cotizaciones/${n}/reenviar-aviso` };
    }
    const reiniciar = () => reintentarPendientes(prisma, transporte, app.log, new Date());
    const estadoDe = async (id: string) => (await prisma.correo.findUniqueOrThrow({ where: { id } })).estado;

    it('reenviado desde el panel, un reinicio posterior no lo vuelve a mandar', async () => {
      const { cookie, aviso, url } = await avisoPendienteDeAntes();
      expect((await pedir('POST', url, cookie, { correoId: aviso.id })).statusCode).toBe(200);
      await esperarCorreos();
      expect(await reiniciar()).toEqual({ enviados: 0, fallidos: 0 });
      expect(await reiniciar()).toEqual({ enviados: 0, fallidos: 0 });
      expect(aCavi()).toHaveLength(1);
      expect(await estadoDe(aviso.id)).toBe('reemplazado');
    });

    it('si el reintento al arrancar lo manda primero, el panel deja de ofrecerlo y el reenvío responde 409', async () => {
      const { cookie, n, aviso, url } = await avisoPendienteDeAntes();
      expect(await reiniciar()).toEqual({ enviados: 1, fallidos: 0 });
      const detalle = (await pedir('GET', `/api/panel/cotizaciones/${n}`, cookie)).json();
      expect(detalle.correos.find((m: { id: string }) => m.id === aviso.id)).toMatchObject({ estado: 'enviado', sePuedeReenviar: false });
      expect((await pedir('POST', url, cookie, { correoId: aviso.id })).statusCode).toBe(409);
      await esperarCorreos();
      expect(aCavi()).toHaveLength(1);
    });

    it('el reintento al arrancar y el reenvío del panel a la vez: sale una sola vez', async () => {
      for (let ronda = 0; ronda < 6; ronda++) {
        await limpiarBase();
        const { cookie, aviso, url } = await avisoPendienteDeAntes();
        const [reintento, reenvio] = await Promise.all([reiniciar(), pedir('POST', url, cookie, { correoId: aviso.id })]);
        await esperarCorreos();
        expect(aCavi()).toHaveLength(1);
        expect([reintento.enviados, reenvio.statusCode]).toEqual(reenvio.statusCode === 200 ? [0, 200] : [1, 409]);
        expect(await estadoDe(aviso.id)).toBe(reenvio.statusCode === 200 ? 'reemplazado' : 'enviado');
      }
    });

    it('mientras otro lo está mandando, el panel no lo ofrece ni lo reenvía', async () => {
      const { cookie, n, aviso, url } = await avisoPendienteDeAntes({ tomadoEn: hace(1) });
      const detalle = (await pedir('GET', `/api/panel/cotizaciones/${n}`, cookie)).json();
      expect(detalle.correos.find((m: { id: string }) => m.id === aviso.id)).toMatchObject({ estado: 'pendiente', sePuedeReenviar: false, motivo: null });
      const res = await pedir('POST', url, cookie, { correoId: aviso.id });
      expect(res.json().error.code).toBe('en_camino');
      await esperarCorreos();
      expect(aCavi()).toHaveLength(0);
      expect(await estadoDe(aviso.id)).toBe('pendiente');
    });

    it('uno que la API anterior había tomado y no resolvió: el arranque lo retoma y sale una vez; el que tomó esta API no se toca', async () => {
      const { aviso } = await avisoPendienteDeAntes({ tomadoEn: hace(6) });
      const deEsta = await prisma.correo.create({ data: { tipo: 'aviso_mensaje_contacto', para: AVISOS, estado: 'pendiente', creadoEn: hace(6), tomadoEn: hace(1), contenido: 'a.b.c' } });
      expect(await reintentarPendientes(prisma, transporte, app.log, hace(3))).toEqual({ enviados: 1, fallidos: 0 });
      expect(await reintentarPendientes(prisma, transporte, app.log, hace(3))).toEqual({ enviados: 0, fallidos: 0 });
      expect(aCavi()).toHaveLength(1);
      expect(await estadoDe(aviso.id)).toBe('enviado');
      expect(await estadoDe(deEsta.id)).toBe('pendiente');
    });

    it('el motivo dice la causa: sin mensaje guardado es el reinicio; con uno que no se puede leer, el cambio de llave', async () => {
      const { cookie, n, aviso } = await avisoPendienteDeAntes({ contenido: null });
      const otro = await prisma.correo.create({ data: { tipo: 'aviso_cotizacion_aceptada', para: AVISOS, cotizacionId: aviso.cotizacionId, estado: 'pendiente', creadoEn: hace(6), contenido: 'a.b.c' } });
      expect(await reiniciar()).toEqual({ enviados: 0, fallidos: 2 });
      expect(aCavi()).toHaveLength(0);
      const detalle = (await pedir('GET', `/api/panel/cotizaciones/${n}`, cookie)).json();
      const motivoDe = (id: string) => detalle.correos.find((m: { id: string }) => m.id === id).motivo;
      expect(motivoDe(aviso.id)).toBe(MOTIVO_SIN_ENVIAR);
      expect(motivoDe(otro.id)).toBe(MOTIVO_ILEGIBLE);
      expect(MOTIVO_ILEGIBLE).not.toMatch(/reinici/);
    });

    it('el envío normal no manda un correo que otro ya tomó o reemplazó mientras esperaba', async () => {
      const correos = crearCorreos(prisma, transporte, { avisos: AVISOS, ctx: { sitio: 'https://cavi.example', correoConsultas: AVISOS }, log: app.log });
      const salida = { raw: { writableFinished: true, destroyed: false, once: () => undefined } };
      const contenido = { asunto: 'a', html: '<p>a</p>', texto: 'a', paraCavi: true, nombreRemitente: null };
      const casos: { estado: EstadoCorreo; tomadoEn: Date | null; sale: boolean }[] = [
        { estado: 'pendiente', tomadoEn: null, sale: true },
        { estado: 'pendiente', tomadoEn: new Date(), sale: false },
        { estado: 'reemplazado', tomadoEn: null, sale: false },
        { estado: 'fallido', tomadoEn: null, sale: false },
        { estado: 'enviado', tomadoEn: null, sale: false },
      ];
      for (const caso of casos) {
        buzon.vaciar();
        const fila = await prisma.correo.create({ data: { tipo: 'aviso_mensaje_contacto', para: AVISOS, estado: caso.estado, tomadoEn: caso.tomadoEn } });
        correos.programar(salida, { id: fila.id, estado: 'pendiente' }, { tipo: 'aviso_mensaje_contacto', para: AVISOS, contenido });
        await vaciarEnvios();
        expect({ ...caso, salio: buzon.mensajes.length === 1 }).toMatchObject({ salio: caso.sale });
        expect((await prisma.correo.findUniqueOrThrow({ where: { id: fila.id } })).estado).toBe(caso.sale ? 'enviado' : caso.estado);
      }
    });

    it('un correo nuevo del mismo tipo deja reemplazado al que había fallado: ya no se ofrece', async () => {
      const { cookie } = await asesorConSesion();
      const n = await solicitud();
      const items = await prisma.cotizacionItem.findMany({ where: { cotizacion: { numero: n } }, orderBy: { orden: 'asc' } });
      const precios = items.map((i) => ({ itemId: i.id, precioUnitario: '100' }));
      smtp.cae = true;
      await pedir('PUT', `/api/panel/cotizaciones/${n}/precios`, cookie, { precios, enviar: true });
      await esperarCorreos();
      smtp.cae = false;
      const fallido = await prisma.correo.findFirstOrThrow({ where: { tipo: 'cotizacion_lista' } });
      expect(fallido.estado).toBe('fallido');
      const corregidos = precios.map((p) => ({ ...p, precioUnitario: '150' }));
      await pedir('PUT', `/api/panel/cotizaciones/${n}/precios`, cookie, { precios: corregidos, enviar: true, avisar: true });
      await esperarCorreos();
      const detalle = (await pedir('GET', `/api/panel/cotizaciones/${n}`, cookie)).json();
      const listas = detalle.correos.filter((m: { tipo: string }) => m.tipo === 'cotizacion_lista');
      expect(listas.map((m: { estado: string; sePuedeReenviar: boolean }) => [m.estado, m.sePuedeReenviar])).toEqual([
        ['enviado', false],
        ['reemplazado', false],
      ]);
      expect((await pedir('POST', `/api/panel/cotizaciones/${n}/reenviar-aviso`, cookie, { correoId: fallido.id })).json().error.code).toBe('ya_reenviado');
    });
  });

  describe('«Reenviar» se ofrece solo cuando el reenvío es posible', () => {
    interface Caso {
      nombre: string;
      tipo: TipoCorreo;
      estado: EstadoCorreo;
      creadoHace?: number;
      tomadoHace?: number;
      preparar?: (d: { n: number; cookie: string; clienteId: string }) => Promise<unknown>;
      sePuede: boolean;
    }

    const cotizar = async ({ n, cookie }: { n: number; cookie: string }) => {
      const items = await prisma.cotizacionItem.findMany({ where: { cotizacion: { numero: n } } });
      const res = await pedir('PUT', `/api/panel/cotizaciones/${n}/precios`, cookie, { precios: items.map((i) => ({ itemId: i.id, precioUnitario: '100' })), enviar: true });
      expect(res.statusCode).toBe(200);
    };
    const confirmarCuenta = () => prisma.cliente.updateMany({ data: { correoConfirmado: true } });

    const casos: Caso[] = [
      { nombre: 'aviso fallido', tipo: 'aviso_solicitud_nueva', estado: 'fallido', sePuede: true },
      { nombre: 'aviso enviado', tipo: 'aviso_solicitud_nueva', estado: 'enviado', sePuede: false },
      { nombre: 'aviso omitido', tipo: 'aviso_solicitud_nueva', estado: 'omitido', sePuede: false },
      { nombre: 'aviso reemplazado', tipo: 'aviso_solicitud_nueva', estado: 'reemplazado', sePuede: false },
      { nombre: 'aviso pendiente reciente', tipo: 'aviso_solicitud_nueva', estado: 'pendiente', creadoHace: 2, sePuede: false },
      { nombre: 'aviso pendiente vencido sin tomar', tipo: 'aviso_solicitud_nueva', estado: 'pendiente', creadoHace: 6, sePuede: true },
      { nombre: 'aviso pendiente viejo tomado hace poco', tipo: 'aviso_solicitud_nueva', estado: 'pendiente', creadoHace: 30, tomadoHace: 1, sePuede: false },
      { nombre: 'aviso pendiente tomado hace mucho', tipo: 'aviso_solicitud_nueva', estado: 'pendiente', creadoHace: 30, tomadoHace: 6, sePuede: true },
      { nombre: 'confirmación fallida, cuenta sin confirmar', tipo: 'confirmacion', estado: 'fallido', sePuede: true },
      { nombre: 'confirmación fallida, cuenta ya confirmada', tipo: 'confirmacion', estado: 'fallido', preparar: confirmarCuenta, sePuede: false },
      { nombre: 'confirmación pendiente vencida, cuenta ya confirmada', tipo: 'confirmacion', estado: 'pendiente', creadoHace: 6, preparar: confirmarCuenta, sePuede: false },
      { nombre: 'cotización lista fallida, precios a la vista', tipo: 'cotizacion_lista', estado: 'fallido', preparar: cotizar, sePuede: true },
      { nombre: 'cotización lista fallida, sin cotizar', tipo: 'cotizacion_lista', estado: 'fallido', sePuede: false },
      {
        nombre: 'cotización lista fallida, devuelta a revisión',
        tipo: 'cotizacion_lista',
        estado: 'fallido',
        preparar: async (d) => {
          await cotizar(d);
          expect((await pedir('POST', `/api/panel/cotizaciones/${d.n}/estado`, d.cookie, { accion: 'cambiar', a: 'en_revision', canal: 'llamada' })).statusCode).toBe(200);
        },
        sePuede: false,
      },
      {
        nombre: 'cotización lista fallida, cotizada por fuera',
        tipo: 'cotizacion_lista',
        estado: 'fallido',
        preparar: async (d) => {
          expect((await pedir('POST', `/api/panel/cotizaciones/${d.n}/estado`, d.cookie, { accion: 'fuera', canal: 'whatsapp' })).statusCode).toBe(200);
        },
        sePuede: false,
      },
      { nombre: 'aviso de aceptada fallido', tipo: 'aviso_cotizacion_aceptada', estado: 'fallido', sePuede: true },
      { nombre: 'aviso de cancelada fallido, sin cancelación del cliente', tipo: 'aviso_cotizacion_cancelada', estado: 'fallido', sePuede: false },
      {
        nombre: 'aviso de cancelada fallido, cancelada por el cliente',
        tipo: 'aviso_cotizacion_cancelada',
        estado: 'fallido',
        preparar: async (d) => {
          await confirmarCuenta();
          await prisma.cambioEstado.create({ data: { cotizacion: { connect: { numero: d.n } }, de: 'recibida', a: 'cancelada', canal: 'sistema' } });
        },
        sePuede: true,
      },
    ];

    it.each(casos)('$nombre: se ofrece = $sePuede, y el servidor responde lo mismo', async (caso) => {
      const { cookie } = await asesorConSesion();
      const n = await solicitud();
      const c = await prisma.cotizacion.findUniqueOrThrow({ where: { numero: n } });
      await caso.preparar?.({ n, cookie, clienteId: c.clienteId });
      await esperarCorreos();
      await prisma.correo.deleteMany();
      buzon.vaciar();
      const para = caso.tipo === 'confirmacion' || caso.tipo === 'cotizacion_lista' ? CORREO : AVISOS;
      const fila = await prisma.correo.create({
        data: {
          tipo: caso.tipo,
          para,
          cotizacionId: c.id,
          estado: caso.estado,
          ...(caso.creadoHace !== undefined ? { creadoEn: hace(caso.creadoHace) } : {}),
          ...(caso.tomadoHace !== undefined ? { tomadoEn: hace(caso.tomadoHace) } : {}),
        },
      });
      const detalle = (await pedir('GET', `/api/panel/cotizaciones/${n}`, cookie)).json();
      const ofrecido = detalle.correos.find((m: { id: string }) => m.id === fila.id).sePuedeReenviar;
      const res = await pedir('POST', `/api/panel/cotizaciones/${n}/reenviar-aviso`, cookie, { correoId: fila.id });
      await esperarCorreos();
      expect({ ofrecido, status: res.statusCode, salieron: buzon.mensajes.length }).toEqual(
        caso.sePuede ? { ofrecido: true, status: 200, salieron: 1 } : { ofrecido: false, status: 409, salieron: 0 },
      );
      const despues = await prisma.correo.findMany({ orderBy: { creadoEn: 'asc' } });
      if (caso.sePuede) expect(despues.map((m) => m.estado).sort()).toEqual(['enviado', 'reemplazado']);
      else expect(despues.map((m) => [m.id, m.estado])).toEqual([[fila.id, caso.estado]]);
    });
  });

  describe('usuarios del panel con el tope global lleno', () => {
    it('la clave no cambia, responde 429 y el cupo del administrador no se gasta; liberado el tope, sí cambia y llega', async () => {
      const admin = await asesorConSesion('admin');
      const asesor = await crearAsesor();
      await esperarCorreos();
      buzon.vaciar();
      await llenarTopeGlobal();
      const url = `/api/panel/usuarios/${asesor.id}`;
      for (let i = 0; i < 31; i++) {
        const res = await pedir('PATCH', url, admin.cookie, { claveTemporalNueva: true });
        expect([res.statusCode, res.json().error.code]).toEqual([429, 'tope_correos']);
      }
      const sigue = await prisma.usuario.findUniqueOrThrow({ where: { id: asesor.id } });
      expect({ claveHash: sigue.claveHash, debeCambiarClave: sigue.debeCambiarClave }).toEqual({ claveHash: asesor.claveHash, debeCambiarClave: false });
      expect(await prisma.correo.count({ where: { para: asesor.correo } })).toBe(0);
      expect(await correosEscritos()).toHaveLength(0);

      await vaciarTopeGlobal();
      expect((await pedir('PATCH', url, admin.cookie, { claveTemporalNueva: true })).statusCode).toBe(200);
      const [bienvenida] = await correosEscritos();
      expect(bienvenida?.para).toBe(asesor.correo);
      const cambiada = await prisma.usuario.findUniqueOrThrow({ where: { id: asesor.id } });
      expect(cambiada.claveHash).not.toBe(asesor.claveHash);
    });

    it('un usuario nuevo no se crea si su bienvenida no puede salir', async () => {
      const admin = await asesorConSesion('admin');
      await llenarTopeGlobal();
      const datos = { nombre: 'Nuevo Asesor', correo: 'nuevo@repcavi.test', rol: 'asesor' };
      const res = await pedir('POST', '/api/panel/usuarios', admin.cookie, datos);
      expect([res.statusCode, res.json().error.code]).toEqual([429, 'tope_correos']);
      expect(await prisma.usuario.count({ where: { correo: datos.correo } })).toBe(0);
      expect(await prisma.correo.count({ where: { para: datos.correo } })).toBe(0);
      await vaciarTopeGlobal();
      expect((await pedir('POST', '/api/panel/usuarios', admin.cookie, datos)).statusCode).toBe(201);
      expect((await correosEscritos()).map((c) => c.para)).toEqual([datos.correo]);
    });
  });
});

describe('límite de solicitudes rechazadas por IP', () => {
  beforeAll(async () => {
    app = await buildServer({ transporteCorreo: transporte });
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await limpiarBase();
  });

  const enviar = (ip: string, datos: unknown) => {
    const f = formulario(datos);
    return app.inject({ method: 'POST', url: '/api/cotizaciones', remoteAddress: ip, payload: f.payload, headers: f.headers });
  };

  it('los errores internos no cuentan: tras 30 respuestas 500 la IP sigue pudiendo pedir', async () => {
    const roto = vi.spyOn(prisma, '$transaction').mockRejectedValue(new Error('la base no responde'));
    try {
      for (let i = 0; i < 30; i++) expect((await enviar('10.1.0.1', solicitudDePrueba())).statusCode).toBe(500);
    } finally {
      roto.mockRestore();
    }
    expect((await enviar('10.1.0.1', solicitudDePrueba({ piezas: [] }))).statusCode).toBe(400);
    expect((await enviar('10.1.0.1', solicitudDePrueba())).statusCode).toBe(201);
  });

  it('caso contrario: 30 respuestas 4xx sí lo llenan, y las 429 que siguen no lo alargan', async () => {
    for (let i = 0; i < 30; i++) expect((await enviar('10.1.0.2', solicitudDePrueba({ piezas: [] }))).statusCode).toBe(400);
    expect((await enviar('10.1.0.2', solicitudDePrueba())).statusCode).toBe(429);
    expect((await enviar('10.1.0.3', solicitudDePrueba())).statusCode).toBe(201);
  });
});
