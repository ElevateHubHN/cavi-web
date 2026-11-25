import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { NotFoundError } from '../../shared/errors.js';
import { POR_PAGINA, pagina } from '../../shared/validacion.js';
import type { Servicios } from '../../servicios.js';
import { SELECT_FILA, filaCotizacion } from './cotizaciones.js';
import { filaCsv } from './csv.js';
import { requierePanel } from './sesion.js';
import { diaEnHonduras } from '../../shared/fechas.js';

const LOTE_CSV = 1000;

const filtrosClientes = z.object({ q: z.string().trim().max(200).optional(), pagina });
const parametroId = z.object({ id: z.string().uuid() });

function leerId(params: unknown, mensaje: string): string {
  const r = parametroId.safeParse(params);
  if (!r.success) throw new NotFoundError(mensaje);
  return r.data.id;
}

const SELECT_MENSAJE = {
  id: true,
  nombre: true,
  empresa: true,
  correo: true,
  telefono: true,
  mensaje: true,
  creadoEn: true,
  atendidoEn: true,
  atendidoPor: { select: { nombre: true } },
} satisfies Prisma.MensajeContactoSelect;

const vistaMensaje = (m: Prisma.MensajeContactoGetPayload<{ select: typeof SELECT_MENSAJE }>) => ({
  id: m.id,
  nombre: m.nombre,
  empresa: m.empresa,
  correo: m.correo,
  telefono: m.telefono,
  mensaje: m.mensaje,
  creadoEn: m.creadoEn.toISOString(),
  atendidoEn: m.atendidoEn?.toISOString() ?? null,
  atendidoPor: m.atendidoPor?.nombre ?? null,
});

const fechaCsv = diaEnHonduras;

export async function rutasOtrasPanel(app: FastifyInstance, { db }: Servicios): Promise<void> {
  app.get('/api/panel/resumen', async (req) => {
    await requierePanel(db, req);
    const [recibidas, mensajesPendientes] = await Promise.all([
      db.cotizacion.count({ where: { estado: 'recibida' } }),
      db.mensajeContacto.count({ where: { atendidoEn: null } }),
    ]);
    return { recibidas, mensajesPendientes };
  });

  app.get('/api/panel/clientes', async (req) => {
    await requierePanel(db, req);
    const f = filtrosClientes.parse(req.query);
    const where: Prisma.ClienteWhereInput = f.q
      ? {
          OR: [
            { nombre: { contains: f.q, mode: 'insensitive' } },
            { empresa: { contains: f.q, mode: 'insensitive' } },
            { correo: { contains: f.q.toLowerCase() } },
          ],
        }
      : {};
    const [filas, total] = await Promise.all([
      db.cliente.findMany({
        where,
        orderBy: [{ creadoEn: 'desc' }, { id: 'asc' }],
        skip: (f.pagina - 1) * POR_PAGINA,
        take: POR_PAGINA,
        select: { id: true, nombre: true, empresa: true, correo: true, creadoEn: true, _count: { select: { cotizaciones: true } } },
      }),
      db.cliente.count({ where }),
    ]);
    return {
      filas: filas.map((c) => ({ id: c.id, nombre: c.nombre, empresa: c.empresa, correo: c.correo, cotizaciones: c._count.cotizaciones, creadoEn: c.creadoEn.toISOString() })),
      total,
      pagina: f.pagina,
      porPagina: POR_PAGINA,
    };
  });

  app.get('/api/panel/clientes/:id', async (req) => {
    await requierePanel(db, req);
    const id = leerId(req.params, 'El cliente no existe.');
    const c = await db.cliente.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        empresa: true,
        correo: true,
        telefono: true,
        rtn: true,
        creadoEn: true,
        cotizaciones: { orderBy: { creadaEn: 'desc' }, take: POR_PAGINA, select: SELECT_FILA },
      },
    });
    if (!c) throw new NotFoundError('El cliente no existe.');
    return { ...c, creadoEn: c.creadoEn.toISOString(), cotizaciones: c.cotizaciones.map(filaCotizacion) };
  });

  app.get('/api/panel/mensajes', async (req) => {
    await requierePanel(db, req);
    const [pendientes, atendidos, totalPendientes] = await Promise.all([
      db.mensajeContacto.findMany({ where: { atendidoEn: null }, orderBy: { creadoEn: 'desc' }, take: POR_PAGINA, select: SELECT_MENSAJE }),
      db.mensajeContacto.findMany({ where: { atendidoEn: { not: null } }, orderBy: { atendidoEn: 'desc' }, take: POR_PAGINA, select: SELECT_MENSAJE }),
      db.mensajeContacto.count({ where: { atendidoEn: null } }),
    ]);
    return { pendientes: pendientes.map(vistaMensaje), atendidos: atendidos.map(vistaMensaje), totalPendientes };
  });

  app.post('/api/panel/mensajes/:id/atendido', async (req) => {
    const usuario = await requierePanel(db, req);
    const id = leerId(req.params, 'El mensaje no existe.');
    // Solo el primero que lo atiende queda anotado: marcarlo otra vez no cambia quién ni cuándo.
    await db.mensajeContacto.updateMany({ where: { id, atendidoEn: null }, data: { atendidoEn: new Date(), atendidoPorId: usuario.id } });
    const m = await db.mensajeContacto.findUnique({ where: { id }, select: SELECT_MENSAJE });
    if (!m) throw new NotFoundError('El mensaje no existe.');
    return vistaMensaje(m);
  });

  app.get('/api/panel/boletin', async (req) => {
    await requierePanel(db, req);
    return { suscriptores: await db.suscriptor.count() };
  });

  app.get('/api/panel/boletin.csv', async (req, reply) => {
    await requierePanel(db, req);
    // La marca UTF-8 al principio hace que Excel muestre bien las tildes y la eñe.
    const partes: string[] = [String.fromCharCode(0xfeff), filaCsv(['correo', 'fecha de alta'])];
    let cursor: string | undefined;
    for (;;) {
      const lote = await db.suscriptor.findMany({
        orderBy: [{ creadoEn: 'asc' }, { id: 'asc' }],
        take: LOTE_CSV,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: { id: true, correo: true, creadoEn: true },
      });
      for (const s of lote) partes.push(filaCsv([s.correo, fechaCsv(s.creadoEn)]));
      if (lote.length < LOTE_CSV) break;
      cursor = lote[lote.length - 1]?.id;
    }
    reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', 'attachment; filename="suscriptores-boletin.csv"')
      .header('cache-control', 'private, no-store');
    return partes.join('');
  });
}
