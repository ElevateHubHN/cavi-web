import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { EstadoCotizacion, Prisma, type PrismaClient, type TipoCorreo } from '@prisma/client';
import { z } from 'zod';
import {
  cambiarEstado,
  cancelarPorAsesor,
  enviarCotizacion,
  formatoNumero,
  guardarPrecios,
  marcarEnviadaPorFuera,
  numeroDesdeTexto,
  tomar,
  totalDe,
  type PrecioPieza,
} from '../../dominio/cotizaciones.js';
import { ConflictError, NotFoundError } from '../../shared/errors.js';
import { inicioDelDiaEnHonduras } from '../../shared/fechas.js';
import { MAX_TEXTO_LIBRE, POR_PAGINA, pagina, textoOpcional } from '../../shared/validacion.js';
import type { Servicios } from '../../servicios.js';
import type { Correos, Envio, Salida } from '../../correos/correos.js';
import {
  MOTIVO_ILEGIBLE,
  MOTIVO_SIN_ENVIAR,
  MOTIVO_TOPE_DIRECCION,
  MOTIVO_TOPE_GLOBAL,
  CUENTAN_PARA_EL_TOPE,
  anotarCorreo,
  candadoDeCorreo,
  candadoDelTope,
  pendienteVencido,
  reemplazarCorreo,
  reservarCorreoDeCuenta,
} from '../../correos/correos.js';
import { emitirConfirmacion, enviarConfirmacion, nuevasCredenciales } from '../clientes/cuentas.js';
import { leerNumero } from '../cotizaciones/rutas.js';
import {
  SELECT_AVISO,
  comentarioDelCliente,
  envioCotizacionAceptada,
  envioCotizacionCancelada,
  envioCotizacionLista,
  envioSolicitudNueva,
} from '../cotizaciones/avisos.js';
import { MAX_CORREOS_POR_HORA, topeDeCorreos, topeGlobal, type LimitePorUsuario } from './limites.js';
import { requierePanel } from './sesion.js';

const MAX_BITACORA = 200;
const MAX_CORREOS_DETALLE = 100;

const vacioANulo = (v: string | undefined) => (v ? v : undefined);
/** Un día de calendario que existe: 2026-02-31 o 2026-13-01 se rechazan, no se corren al mes siguiente. */
const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((dia) => {
    const d = new Date(`${dia}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dia;
  }, 'Fecha inválida.')
  .optional();

export const filtrosLista = z.object({
  estado: z.union([z.nativeEnum(EstadoCotizacion), z.literal('todas')]).optional(),
  sucursal: z.string().trim().max(120).optional().transform(vacioANulo),
  asesor: z.union([z.literal('yo'), z.literal('ninguno'), z.string().uuid()]).optional(),
  q: z.string().trim().max(200).optional().transform(vacioANulo),
  desde: fecha,
  hasta: fecha,
  pagina,
});

type Filtros = z.infer<typeof filtrosLista>;

const inicioDelDia = inicioDelDiaEnHonduras;

/** Lo que filtran la lista y sus contadores, salvo el estado: los contadores muestran todas las pestañas. */
export function filtroSinEstado(f: Omit<Filtros, 'estado' | 'pagina'>, usuarioId: string): Prisma.CotizacionWhereInput {
  const y: Prisma.CotizacionWhereInput[] = [];
  if (f.sucursal === 'envio') y.push({ modoEntrega: 'envio' });
  else if (f.sucursal) y.push({ modoEntrega: 'retiro', sucursal: f.sucursal });
  if (f.asesor === 'yo') y.push({ asesorId: usuarioId });
  else if (f.asesor === 'ninguno') y.push({ asesorId: null });
  else if (f.asesor) y.push({ asesorId: f.asesor });
  if (f.desde) y.push({ creadaEn: { gte: inicioDelDia(f.desde) } });
  if (f.hasta) y.push({ creadaEn: { lt: new Date(inicioDelDia(f.hasta).getTime() + 24 * 3600 * 1000) } });
  if (f.q) {
    const o: Prisma.CotizacionWhereInput[] = [
      { nombre: { contains: f.q, mode: 'insensitive' } },
      { empresa: { contains: f.q, mode: 'insensitive' } },
      { cliente: { correo: { contains: f.q.toLowerCase() } } },
    ];
    const numero = numeroDesdeTexto(f.q);
    if (numero !== null) o.push({ numero });
    y.push({ OR: o });
  }
  return y.length ? { AND: y } : {};
}

export const SELECT_FILA = {
  numero: true,
  creadaEn: true,
  estado: true,
  clienteId: true,
  nombre: true,
  empresa: true,
  modoEntrega: true,
  sucursal: true,
  ciudad: true,
  cotizadaPor: true,
  asesor: { select: { nombre: true } },
  items: { select: { cantidad: true, precioUnitario: true } },
} satisfies Prisma.CotizacionSelect;

type Fila = Prisma.CotizacionGetPayload<{ select: typeof SELECT_FILA }>;

/** Total para el personal: lo que lleva puesto hasta ahora; null si ninguna pieza tiene precio. */
const totalPanel = (items: readonly { cantidad: number; precioUnitario: Prisma.Decimal | null }[]): number | null =>
  items.some((i) => i.precioUnitario !== null) ? totalDe(items).toNumber() : null;

export const filaCotizacion = (c: Fila) => ({
  numero: c.numero,
  creadaEn: c.creadaEn.toISOString(),
  estado: c.estado,
  cliente: { id: c.clienteId, nombre: c.nombre, empresa: c.empresa },
  piezas: c.items.length,
  asesor: c.asesor?.nombre ?? null,
  entrega: { modo: c.modoEntrega, sucursal: c.modoEntrega === 'retiro' ? c.sucursal : null, ciudad: c.modoEntrega === 'envio' ? c.ciudad : null },
  total: totalPanel(c.items),
  cotizadaPor: c.cotizadaPor,
});

const SELECT_CORREO = { id: true, tipo: true, para: true, estado: true, error: true, creadoEn: true, tomadoEn: true } satisfies Prisma.CorreoSelect;

type CorreoDeDetalle = Prisma.CorreoGetPayload<{ select: typeof SELECT_CORREO }>;

const SELECT_DETALLE = {
  ...SELECT_AVISO,
  clienteId: true,
  cliente: { select: { correo: true, nombre: true, correoConfirmado: true } },
  asesor: { select: { id: true, nombre: true } },
  items: {
    select: { id: true, productoId: true, nombre: true, numeroParte: true, cantidad: true, precioUnitario: true },
    orderBy: { orden: 'asc' },
  },
  cambios: {
    select: { id: true, creadoEn: true, de: true, a: true, canal: true, nota: true, usuarioId: true, usuario: { select: { nombre: true } } },
    orderBy: { creadoEn: 'desc' },
    take: MAX_BITACORA,
  },
  correos: { select: SELECT_CORREO, orderBy: { creadoEn: 'desc' }, take: MAX_CORREOS_DETALLE },
} satisfies Prisma.CotizacionSelect;

type Detalle = Prisma.CotizacionGetPayload<{ select: typeof SELECT_DETALLE }>;

const MOTIVOS_PROPIOS = new Set([MOTIVO_TOPE_GLOBAL, MOTIVO_SIN_ENVIAR, MOTIVO_ILEGIBLE, MOTIVO_TOPE_DIRECCION]);

/** Por qué no salió un correo, en palabras del personal; el error técnico del servidor de correo queda solo en el registro. */
function motivoCorreo(m: CorreoDeDetalle, ahora = Date.now()): string | null {
  if (pendienteVencido(m, ahora)) return 'No se confirmó el envío';
  if (m.estado === 'enviado' || m.estado === 'pendiente') return null;
  if (m.estado === 'reemplazado') return 'Se mandó otro en su lugar';
  if (m.error && MOTIVOS_PROPIOS.has(m.error)) return m.error;
  return m.estado === 'fallido' ? 'El servidor de correo no lo aceptó' : null;
}

/** Arma de nuevo, con los datos de hoy, el correo de una cotización que no llegó. Null si ese tipo ya no tiene sentido mandarlo. */
function armarReenvio(correos: Correos, tipo: TipoCorreo, c: Detalle): Envio | null {
  switch (tipo) {
    case 'cotizacion_lista':
      return envioCotizacionLista(correos, c);
    case 'aviso_solicitud_nueva':
      return envioSolicitudNueva(correos, c);
    case 'aviso_cotizacion_aceptada':
      return envioCotizacionAceptada(correos, c);
    case 'aviso_cotizacion_cancelada': {
      const delCliente = c.cambios.find((x) => x.a === 'cancelada' && x.de !== 'cancelada' && x.usuarioId === null);
      return delCliente?.de ? envioCotizacionCancelada(correos, c, { comentario: comentarioDelCliente(c.motivoCancelacion), de: delCliente.de }) : null;
    }
    default:
      return null;
  }
}

/** Qué se manda al reenviar: el correo armado de nuevo o, para la confirmación, un enlace y una clave nuevos. */
type Reenvio = { puede: false; rechazo: ConflictError } | { puede: true; envio: Envio | 'confirmacion' };

const noSeReenvia = () => new ConflictError('no_se_reenvia', 'Este correo ya no se puede reenviar.');
const enCamino = () => new ConflictError('en_camino', 'Ese correo se está enviando. Si en unos minutos no sale, se puede reenviar.');

/**
 * Único lugar que decide si un correo de una cotización se puede reenviar, y con qué: lo usan
 * la lista del detalle (para ofrecer «Reenviar») y el reenvío mismo. Se reenvía el que no salió
 * (fallido, o pendiente que ya no está en camino) y que hoy todavía tiene sentido mandar.
 */
function reenvio(correos: Correos, m: CorreoDeDetalle, c: Detalle, ahora = Date.now()): Reenvio {
  const no = (rechazo: ConflictError): Reenvio => ({ puede: false, rechazo });
  switch (m.estado) {
    case 'enviado':
      return no(new ConflictError('ya_enviado', 'Ese correo ya se envió.'));
    case 'reemplazado':
      return no(new ConflictError('ya_reenviado', 'Ese correo ya se reenvió.'));
    case 'omitido':
      return no(noSeReenvia());
    case 'pendiente':
      if (!pendienteVencido(m, ahora)) return no(enCamino());
      break;
    case 'fallido':
      break;
  }
  if (m.tipo === 'confirmacion') {
    if (c.cliente.correoConfirmado) return no(new ConflictError('ya_confirmo', 'El cliente ya confirmó su correo: no hace falta reenviarlo.'));
    return { puede: true, envio: 'confirmacion' };
  }
  const envio = armarReenvio(correos, m.tipo, c);
  return envio ? { puede: true, envio } : no(noSeReenvia());
}

const vistaDetalle = (correos: Correos, c: Detalle) => ({
  numero: c.numero,
  creadaEn: c.creadaEn.toISOString(),
  estado: c.estado,
  asesor: c.asesor,
  cotizadaPor: c.cotizadaPor,
  motivoCancelacion: c.estado === 'cancelada' ? c.motivoCancelacion : null,
  clienteId: c.clienteId,
  contacto: { nombre: c.nombre, telefono: c.telefono, empresa: c.empresa, rtn: c.rtn, correo: c.cliente.correo },
  entrega: {
    modo: c.modoEntrega,
    sucursal: c.modoEntrega === 'retiro' ? c.sucursal : null,
    departamento: c.modoEntrega === 'envio' ? c.departamento : null,
    ciudad: c.modoEntrega === 'envio' ? c.ciudad : null,
    direccion: c.modoEntrega === 'envio' ? c.direccion : null,
    referencia: c.modoEntrega === 'envio' ? c.referencia : null,
  },
  equipo: c.equipo,
  serie: c.serie,
  notas: c.notas,
  conFoto: c.fotoArchivo !== null,
  piezas: c.items.map((i) => ({
    id: i.id,
    productoId: i.productoId,
    nombre: i.nombre,
    numeroParte: i.numeroParte,
    cantidad: i.cantidad,
    precioUnitario: i.precioUnitario ? i.precioUnitario.toNumber() : null,
  })),
  total: totalPanel(c.items),
  bitacora: c.cambios.map((x) => ({ id: x.id, creadoEn: x.creadoEn.toISOString(), de: x.de, a: x.a, usuario: x.usuario?.nombre ?? null, canal: x.canal, nota: x.nota })),
  correos: vistaCorreos(correos, c),
});

function vistaCorreos(correos: Correos, c: Detalle) {
  const ahora = Date.now();
  return c.correos.map((m) => ({
    id: m.id,
    tipo: m.tipo,
    para: m.para,
    estado: m.estado,
    motivo: motivoCorreo(m, ahora),
    sePuedeReenviar: reenvio(correos, m, c, ahora).puede,
    creadoEn: m.creadoEn.toISOString(),
  }));
}

async function detalle(db: PrismaClient | Prisma.TransactionClient, numero: number): Promise<Detalle> {
  const c = await db.cotizacion.findUnique({ where: { numero }, select: SELECT_DETALLE });
  if (!c) throw new NotFoundError('La cotización no existe.');
  return c;
}

const precioTexto = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .pipe(z.string().regex(/^-?\d{1,12}(\.\d{1,6})?$/, 'Escribe el precio como número, por ejemplo 685.00.'));

const cuerpoPrecios = z
  .object({
    precios: z.array(z.object({ itemId: z.string().uuid(), precioUnitario: precioTexto.nullable() }).strict()).max(50),
    enviar: z.boolean(),
    avisar: z.boolean().optional(),
  })
  .strict();

const canalFuera = z.enum(['whatsapp', 'llamada', 'correo', 'tienda']);
const nota = textoOpcional(MAX_TEXTO_LIBRE);
const estadoNoCancelada = z.enum(['recibida', 'en_revision', 'cotizada', 'confirmada', 'entregada']);

const cuerpoEstado = z.discriminatedUnion('accion', [
  z.object({ accion: z.literal('tomar') }).strict(),
  z.object({ accion: z.literal('fuera'), canal: canalFuera, nota }).strict(),
  z.object({ accion: z.literal('cambiar'), a: estadoNoCancelada, canal: canalFuera, nota }).strict(),
  z.object({ accion: z.literal('cancelar'), motivo: textoOpcional(MAX_TEXTO_LIBRE), nota }).strict(),
]);

const cuerpoReenvio = z.object({ correoId: z.string().uuid() }).strict();

const TIPO_IMAGEN: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export async function rutasCotizacionesPanel(app: FastifyInstance, { db, correos, archivosDir }: Servicios, limite: LimitePorUsuario): Promise<void> {
  async function avisarCotizacionLista(salida: Salida, numero: number): Promise<void> {
    const c = await db.cotizacion.findUniqueOrThrow({ where: { numero }, select: SELECT_AVISO });
    const envio = envioCotizacionLista(correos, c);
    if (envio) await correos.enviar(salida, envio);
  }

  app.get('/api/panel/cotizaciones', async (req) => {
    const usuario = await requierePanel(db, req);
    const f = filtrosLista.parse(req.query);
    const base = filtroSinEstado(f, usuario.id);
    const where: Prisma.CotizacionWhereInput = f.estado && f.estado !== 'todas' ? { AND: [base, { estado: f.estado }] } : base;
    const [filas, total, porEstado] = await Promise.all([
      db.cotizacion.findMany({ where, orderBy: [{ creadaEn: 'desc' }, { numero: 'desc' }], skip: (f.pagina - 1) * POR_PAGINA, take: POR_PAGINA, select: SELECT_FILA }),
      db.cotizacion.count({ where }),
      db.cotizacion.groupBy({ by: ['estado'], where: base, _count: { _all: true } }),
    ]);
    const contadores: Record<EstadoCotizacion | 'todas', number> = { recibida: 0, en_revision: 0, cotizada: 0, confirmada: 0, entregada: 0, cancelada: 0, todas: 0 };
    for (const g of porEstado) {
      contadores[g.estado] = g._count._all;
      contadores.todas += g._count._all;
    }
    return { filas: filas.map(filaCotizacion), total, pagina: f.pagina, porPagina: POR_PAGINA, contadores };
  });

  app.get('/api/panel/cotizaciones/:numero', async (req) => {
    await requierePanel(db, req);
    return vistaDetalle(correos, await detalle(db, leerNumero(req.params)));
  });

  app.put('/api/panel/cotizaciones/:numero/precios', async (req, reply) => {
    const usuario = await requierePanel(db, req);
    const numero = leerNumero(req.params);
    const datos = cuerpoPrecios.parse(req.body);
    const precios: PrecioPieza[] = datos.precios.map((p) => ({
      itemId: p.itemId,
      precioUnitario: p.precioUnitario === null ? null : new Prisma.Decimal(p.precioUnitario),
    }));
    if (datos.enviar) {
      const r = await enviarCotizacion(db, { numero, usuarioId: usuario.id, precios, avisar: datos.avisar === true });
      if (r.avisos.includes('cliente_cotizacion_lista')) await avisarCotizacionLista(reply, numero);
    } else {
      await guardarPrecios(db, { numero, usuarioId: usuario.id, precios });
    }
    return vistaDetalle(correos, await detalle(db, numero));
  });

  app.post('/api/panel/cotizaciones/:numero/estado', async (req) => {
    const usuario = await requierePanel(db, req);
    const numero = leerNumero(req.params);
    const datos = cuerpoEstado.parse(req.body);
    const base = { numero, usuarioId: usuario.id };
    switch (datos.accion) {
      case 'tomar':
        await tomar(db, base);
        break;
      case 'fuera':
        await marcarEnviadaPorFuera(db, { ...base, canal: datos.canal, nota: datos.nota });
        break;
      case 'cambiar':
        await cambiarEstado(db, { ...base, a: datos.a, canal: datos.canal, nota: datos.nota });
        break;
      case 'cancelar':
        await cancelarPorAsesor(db, { ...base, motivo: datos.motivo, nota: datos.nota });
        break;
    }
    return vistaDetalle(correos, await detalle(db, numero));
  });

  app.get('/api/panel/cotizaciones/:numero/foto', async (req, reply) => {
    await requierePanel(db, req);
    const fila = await db.cotizacion.findUnique({ where: { numero: leerNumero(req.params) }, select: { fotoArchivo: true } });
    const archivo = fila?.fotoArchivo ?? '';
    const tipo = /^[0-9a-f-]{36}\.(jpg|png|webp)$/.exec(archivo)?.[1];
    const ruta = join(archivosDir, archivo);
    if (!tipo || !(await stat(ruta).then((s) => s.isFile(), () => false))) throw new NotFoundError('Esta cotización no tiene foto.');
    reply
      .header('content-type', TIPO_IMAGEN[tipo] ?? 'application/octet-stream')
      .header('content-disposition', 'inline')
      .header('cache-control', 'private, no-store');
    return reply.send(createReadStream(ruta));
  });

  app.post('/api/panel/cotizaciones/:numero/reenviar-aviso', async (req, reply) => {
    const usuario = await requierePanel(db, req);
    const numero = leerNumero(req.params);
    const { correoId } = cuerpoReenvio.parse(req.body);

    const decidir = async (cx: PrismaClient | Prisma.TransactionClient, ahora: Date) => {
      const c = await detalle(cx, numero);
      const original = await cx.correo.findFirst({ where: { id: correoId, cotizacionId: c.id }, select: SELECT_CORREO });
      if (!original) throw new NotFoundError('Ese correo no es de esta cotización.');
      const r = reenvio(correos, original, c, ahora.getTime());
      if (!r.puede) throw r.rechazo;
      return { c, original, envio: r.envio };
    };

    // Lo que ya se sabe que no se puede se responde antes de gastar el cupo del usuario.
    await decidir(db, new Date());
    const devolverCupo = limite.consumir(usuario.id);

    const hecho = await db
      .$transaction(async (tx) => {
        // Con la cotización bloqueada, se decide otra vez: ni su estado ni un doble clic cambian nada entre decidir y anotar.
        // FOR NO KEY UPDATE y no FOR UPDATE: no bloquea a quien anota otro correo de la cotización y ya tiene el candado del tope.
        await tx.$queryRaw`SELECT "id" FROM "cotizacion" WHERE "numero" = ${numero} FOR NO KEY UPDATE`;
        const ahora = new Date();
        const { c, original, envio } = await decidir(tx, ahora);
        // Como el tope por dirección: cuenta lo que salió o está saliendo, no lo que falló.
        const enLaHora = await tx.correo.count({
          where: { cotizacionId: c.id, tipo: original.tipo, estado: { in: [...CUENTAN_PARA_EL_TOPE] }, creadoEn: { gt: new Date(ahora.getTime() - 3_600_000) } },
        });
        if (enLaHora >= MAX_CORREOS_POR_HORA) throw topeDeCorreos();
        if (envio === 'confirmacion') await candadoDeCorreo(tx, c.cliente.correo);
        await candadoDelTope(tx);
        // Si el reintento del arranque acaba de tomarlo, ese proceso lo envía y aquí no se manda otro.
        if (!(await reemplazarCorreo(tx, original.id, ahora))) throw enCamino();
        if (envio === 'confirmacion') {
          const credenciales = nuevasCredenciales();
          const anotado = await reservarCorreoDeCuenta(tx, { tipo: 'confirmacion', para: c.cliente.correo, cotizacionId: c.id }, ahora);
          if (!anotado) throw topeDeCorreos();
          if (anotado.estado !== 'pendiente') throw topeGlobal();
          await emitirConfirmacion(tx, c.clienteId, credenciales);
          return { c, anotado, envio: null, credenciales };
        }
        const anotado = await anotarCorreo(tx, { tipo: original.tipo, para: envio.para, cotizacionId: c.id }, ahora);
        if (anotado.estado !== 'pendiente') throw topeGlobal();
        return { c, anotado, envio, credenciales: null };
      })
      .catch((e: unknown) => {
        devolverCupo();
        throw e;
      });

    if (hecho.credenciales) {
      const { c } = hecho;
      enviarConfirmacion(correos, reply, {
        anotado: hecho.anotado,
        para: c.cliente.correo,
        nombre: c.cliente.nombre,
        credenciales: hecho.credenciales,
        numero: formatoNumero(c.numero),
        cotizacionId: c.id,
      });
    } else if (hecho.envio) {
      correos.programar(reply, hecho.anotado, hecho.envio);
    }
    return vistaDetalle(correos, await detalle(db, numero));
  });
}
