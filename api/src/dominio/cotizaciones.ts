import { Prisma, type Canal, type EstadoCotizacion, type PrismaClient } from '@prisma/client';
import { AppError, ConflictError, NotFoundError } from '../shared/errors.js';
import { formatoLempiras } from '../correos/plantillas.js';

export const ESTADOS: readonly EstadoCotizacion[] = ['recibida', 'en_revision', 'cotizada', 'confirmada', 'entregada', 'cancelada'];
export const ORDEN_ESTADOS: readonly EstadoCotizacion[] = ['recibida', 'en_revision', 'cotizada', 'confirmada', 'entregada'];
export const CANALES_FUERA: readonly Canal[] = ['whatsapp', 'llamada', 'correo', 'tienda'];

export const ETIQUETA_ESTADO: Record<EstadoCotizacion, string> = {
  recibida: 'Recibida',
  en_revision: 'En revisión',
  cotizada: 'Cotizada',
  confirmada: 'Confirmada',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
};

export const ETIQUETA_CANAL: Record<Canal, string> = {
  sistema: 'el portal',
  whatsapp: 'WhatsApp',
  llamada: 'llamada',
  correo: 'correo',
  tienda: 'en tienda',
};

export const MOTIVO_CANCELADA_POR_CLIENTE = 'Cancelada por el cliente desde su portal';
export const NOTA_FOTO_ELIMINADA = 'Foto eliminada por antigüedad';
export const NOTA_CORRECCION = 'Corrigió los precios';
export const MAX_PIEZAS = 50;
export const MAX_CANTIDAD = 999;
export const PRECIO_MAXIMO = new Prisma.Decimal('99999999.99');

const ESTADOS_CLIENTE_PUEDE_CANCELAR: readonly EstadoCotizacion[] = ['recibida', 'en_revision', 'cotizada'];
const ESTADOS_CON_PRECIOS_VISIBLES: readonly EstadoCotizacion[] = ['cotizada', 'confirmada', 'entregada'];
const ESTADOS_PRECIOS_EDITABLES: readonly EstadoCotizacion[] = ['recibida', 'en_revision', 'cotizada'];
export const ESTADOS_FOTO_SE_BORRA: readonly EstadoCotizacion[] = ['entregada', 'cancelada'];

export type Aviso = 'cliente_cotizacion_lista' | 'cavi_cotizacion_aceptada' | 'cavi_cotizacion_cancelada';

export interface ResultadoCambio {
  cotizacionId: string;
  numero: number;
  de: EstadoCotizacion;
  a: EstadoCotizacion;
  avisos: Aviso[];
}

type ItemConPrecio = { cantidad: number; precioUnitario: Prisma.Decimal | null };

export const formatoNumero = (numero: number): string => `CT-${numero}`;

export function numeroDesdeTexto(texto: string): number | null {
  const hallado = /^(?:CT-)?(\d{1,9})$/i.exec(texto.trim());
  if (!hallado?.[1]) return null;
  const n = Number(hallado[1]);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export const todasConPrecio = (items: readonly ItemConPrecio[]): boolean =>
  items.length > 0 && items.every((i) => i.precioUnitario !== null && i.precioUnitario.greaterThan(0));

export function totalDe(items: readonly ItemConPrecio[]): Prisma.Decimal {
  return items
    .reduce((suma, i) => (i.precioUnitario ? suma.plus(i.precioUnitario.times(i.cantidad)) : suma), new Prisma.Decimal(0))
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export const preciosVisiblesParaCliente = (c: { estado: EstadoCotizacion; cotizadaPor: Canal | null }): boolean =>
  c.cotizadaPor === 'sistema' && ESTADOS_CON_PRECIOS_VISIBLES.includes(c.estado);

export const clientePuedeAceptar = (estado: EstadoCotizacion): boolean => estado === 'cotizada';
export const clientePuedeCancelar = (estado: EstadoCotizacion): boolean => ESTADOS_CLIENTE_PUEDE_CANCELAR.includes(estado);

export function motivoCanceladaPorCliente(comentario: string | null | undefined): string {
  const limpio = comentario?.trim();
  return limpio ? `${MOTIVO_CANCELADA_POR_CLIENTE}: ${limpio}` : MOTIVO_CANCELADA_POR_CLIENTE;
}

export function validarPrecio(valor: Prisma.Decimal): void {
  if (!valor.isFinite() || valor.lessThanOrEqualTo(0) || valor.greaterThan(PRECIO_MAXIMO) || valor.decimalPlaces() > 2) {
    throw new AppError('precio_invalido', 'Cada precio debe ser mayor que cero, con hasta dos decimales.', 400);
  }
}

function exigirCanalFuera(canal: Canal): void {
  if (!CANALES_FUERA.includes(canal)) {
    throw new AppError('canal_invalido', 'Indica por dónde se hizo: WhatsApp, llamada, correo o en tienda.', 400);
  }
}

function exigirMotivo(motivo: string | null | undefined): string {
  const limpio = motivo?.trim();
  if (!limpio) throw new AppError('falta_motivo', 'Indica el motivo de la cancelación.', 400);
  return limpio;
}

type Tx = Prisma.TransactionClient;

const SELECT_BLOQUEADA = {
  id: true,
  numero: true,
  clienteId: true,
  estado: true,
  asesorId: true,
  cotizadaPor: true,
  cotizadaEn: true,
  items: { select: { id: true, cantidad: true, precioUnitario: true }, orderBy: { orden: 'asc' } },
} satisfies Prisma.CotizacionSelect;

type Bloqueada = Prisma.CotizacionGetPayload<{ select: typeof SELECT_BLOQUEADA }>;

async function bloquear(tx: Tx, numero: number, clienteId?: string): Promise<Bloqueada> {
  const filas = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM cotizacion WHERE numero = ${numero} FOR UPDATE`;
  const id = filas[0]?.id;
  if (!id) throw new NotFoundError('La cotización no existe.');
  const c = await tx.cotizacion.findUniqueOrThrow({ where: { id }, select: SELECT_BLOQUEADA });
  if (clienteId !== undefined && c.clienteId !== clienteId) throw new NotFoundError('La cotización no existe.');
  return c;
}

const marcasDeTiempo = (a: EstadoCotizacion, ahora: Date, actual: { cotizadaEn: Date | null }): Prisma.CotizacionUpdateInput => {
  const despues = (e: EstadoCotizacion) => a !== 'cancelada' && ORDEN_ESTADOS.indexOf(e) > ORDEN_ESTADOS.indexOf(a);
  return {
    ...(a === 'cotizada' ? { cotizadaEn: actual.cotizadaEn ?? ahora } : despues('cotizada') ? { cotizadaEn: null } : {}),
    ...(a === 'confirmada' ? { confirmadaEn: ahora } : despues('confirmada') ? { confirmadaEn: null } : {}),
    ...(a === 'entregada' ? { entregadaEn: ahora } : despues('entregada') ? { entregadaEn: null } : {}),
    ...(a === 'cancelada' ? { canceladaEn: ahora } : { canceladaEn: null, motivoCancelacion: null }),
  };
};

/** Volver a «recibida» la deja sin asignar; cualquier otra acción del personal sobre una sin asesor la deja a su nombre. */
function asesorQueAtiende(c: Bloqueada, a: EstadoCotizacion, usuarioId: string | null): Prisma.CotizacionUpdateInput {
  if (usuarioId === null) return {};
  if (a === 'recibida') return c.asesorId === null ? {} : { asesor: { disconnect: true } };
  return c.asesorId === null ? { asesor: { connect: { id: usuarioId } } } : {};
}

async function registrar(
  tx: Tx,
  c: Bloqueada,
  datos: { a: EstadoCotizacion; usuarioId: string | null; canal: Canal; nota?: string | null; cambios: Prisma.CotizacionUpdateInput },
): Promise<void> {
  await tx.cotizacion.update({ where: { id: c.id }, data: { estado: datos.a, ...asesorQueAtiende(c, datos.a, datos.usuarioId), ...datos.cambios } });
  await tx.cambioEstado.create({
    data: {
      cotizacionId: c.id,
      de: c.estado,
      a: datos.a,
      usuarioId: datos.usuarioId,
      canal: datos.canal,
      nota: datos.nota?.trim() || null,
    },
  });
}

const resultado = (c: Bloqueada, a: EstadoCotizacion, avisos: Aviso[]): ResultadoCambio => ({
  cotizacionId: c.id,
  numero: c.numero,
  de: c.estado,
  a,
  avisos,
});

/** El total que ve el cliente en su portal; null si no ve precios. */
const totalVisible = (c: Bloqueada): Prisma.Decimal | null => (preciosVisiblesParaCliente(c) ? totalDe(c.items) : null);

/**
 * El cliente acepta el total que vio. Si mientras tanto el asesor corrigió los precios (o dejó de
 * mostrarlos), responde 409 y la cotización no cambia: tiene que revisarla otra vez.
 */
export async function aceptarPorCliente(
  db: PrismaClient,
  p: { clienteId: string; numero: number; totalVisto: Prisma.Decimal | null },
): Promise<ResultadoCambio> {
  return db.$transaction(async (tx) => {
    const c = await bloquear(tx, p.numero, p.clienteId);
    if (!clientePuedeAceptar(c.estado)) {
      throw new ConflictError('estado_no_permite', 'Esta cotización ya no se puede aceptar.', { estado: c.estado });
    }
    const total = totalVisible(c);
    const coincide = total === null ? p.totalVisto === null : p.totalVisto !== null && total.equals(p.totalVisto);
    if (!coincide) throw new ConflictError('precio_cambio', 'Los precios se actualizaron, revísalos antes de aceptar.');
    const ahora = new Date();
    await registrar(tx, c, {
      a: 'confirmada',
      usuarioId: null,
      canal: 'sistema',
      nota: total ? `Total aceptado: ${formatoLempiras(total)}` : null,
      cambios: marcasDeTiempo('confirmada', ahora, c),
    });
    return resultado(c, 'confirmada', ['cavi_cotizacion_aceptada']);
  });
}

export async function cancelarPorCliente(
  db: PrismaClient,
  p: { clienteId: string; numero: number; comentario?: string | null },
): Promise<ResultadoCambio> {
  return db.$transaction(async (tx) => {
    const c = await bloquear(tx, p.numero, p.clienteId);
    if (!clientePuedeCancelar(c.estado)) {
      throw new ConflictError('estado_no_permite', 'Esta cotización ya no se puede cancelar desde el portal.', { estado: c.estado });
    }
    const ahora = new Date();
    await registrar(tx, c, {
      a: 'cancelada',
      usuarioId: null,
      canal: 'sistema',
      nota: p.comentario,
      cambios: { ...marcasDeTiempo('cancelada', ahora, c), motivoCancelacion: motivoCanceladaPorCliente(p.comentario) },
    });
    return resultado(c, 'cancelada', ['cavi_cotizacion_cancelada']);
  });
}

export async function tomar(db: PrismaClient, p: { numero: number; usuarioId: string }): Promise<ResultadoCambio> {
  return db.$transaction(async (tx) => {
    const c = await bloquear(tx, p.numero);
    if (c.estado !== 'recibida') {
      throw new ConflictError('estado_no_permite', 'Solo se toma una solicitud recibida.', { estado: c.estado });
    }
    await registrar(tx, c, { a: 'en_revision', usuarioId: p.usuarioId, canal: 'sistema', cambios: { asesor: { connect: { id: p.usuarioId } } } });
    return resultado(c, 'en_revision', []);
  });
}

export interface PrecioPieza {
  itemId: string;
  precioUnitario: Prisma.Decimal | null;
}

const mismoPrecio = (a: Prisma.Decimal | null, b: Prisma.Decimal | null): boolean => (a === null || b === null ? a === b : a.equals(b));

/** Guarda solo los precios que cambiaron; devuelve si cambió alguno. */
async function aplicarPrecios(tx: Tx, c: Bloqueada, precios: readonly PrecioPieza[]): Promise<boolean> {
  const propios = new Set(c.items.map((i) => i.id));
  const vistos = new Set<string>();
  for (const p of precios) {
    if (!propios.has(p.itemId) || vistos.has(p.itemId)) {
      throw new AppError('pieza_invalida', 'Una de las piezas no pertenece a esta cotización.', 400);
    }
    vistos.add(p.itemId);
    if (p.precioUnitario !== null) validarPrecio(p.precioUnitario);
  }
  let cambiaron = false;
  for (const p of precios) {
    const item = c.items.find((i) => i.id === p.itemId);
    if (!item || mismoPrecio(item.precioUnitario, p.precioUnitario)) continue;
    await tx.cotizacionItem.update({ where: { id: p.itemId }, data: { precioUnitario: p.precioUnitario } });
    item.precioUnitario = p.precioUnitario;
    cambiaron = true;
  }
  return cambiaron;
}

/** Guarda precios sin enviarlos. Si el cliente ya ve los precios del sistema y alguno cambió, queda en la bitácora como corrección. */
export async function guardarPrecios(
  db: PrismaClient,
  p: { numero: number; usuarioId: string; precios: readonly PrecioPieza[] },
): Promise<{ cotizacionId: string; corregidos: boolean }> {
  return db.$transaction(async (tx) => {
    const c = await bloquear(tx, p.numero);
    if (!ESTADOS_PRECIOS_EDITABLES.includes(c.estado)) {
      throw new ConflictError('estado_no_permite', 'Los precios de una cotización confirmada, entregada o cancelada no se cambian.', { estado: c.estado });
    }
    const visibles = preciosVisiblesParaCliente(c);
    const cambiaron = await aplicarPrecios(tx, c, p.precios);
    if (visibles && !todasConPrecio(c.items)) {
      throw new AppError('faltan_precios', 'El cliente ya ve esta cotización: cada pieza debe conservar un precio mayor que cero.', 400);
    }
    const corregidos = visibles && cambiaron;
    if (corregidos) {
      await registrar(tx, c, { a: c.estado, usuarioId: p.usuarioId, canal: 'sistema', nota: NOTA_CORRECCION, cambios: {} });
    }
    return { cotizacionId: c.id, corregidos };
  });
}

/**
 * Pasa a cotizada con los precios del sistema. Si el cliente ya tenía esos precios,
 * es una corrección y solo se le avisa si `avisar`; si no cambió ningún precio, no pasa nada.
 */
export async function enviarCotizacion(
  db: PrismaClient,
  p: { numero: number; usuarioId: string; precios?: readonly PrecioPieza[]; avisar?: boolean },
): Promise<ResultadoCambio> {
  return db.$transaction(async (tx) => {
    const c = await bloquear(tx, p.numero);
    if (!ESTADOS_PRECIOS_EDITABLES.includes(c.estado)) {
      throw new ConflictError('estado_no_permite', 'Una cotización confirmada, entregada o cancelada no se vuelve a enviar.', { estado: c.estado });
    }
    const cambiaron = p.precios ? await aplicarPrecios(tx, c, p.precios) : false;
    if (!todasConPrecio(c.items)) {
      throw new AppError('faltan_precios', 'Pon un precio mayor que cero a cada pieza antes de enviar la cotización.', 400);
    }
    const esCorreccion = c.estado === 'cotizada' && c.cotizadaPor === 'sistema';
    if (esCorreccion && !cambiaron) return resultado(c, 'cotizada', []);
    await registrar(tx, c, {
      a: 'cotizada',
      usuarioId: p.usuarioId,
      canal: 'sistema',
      nota: esCorreccion ? NOTA_CORRECCION : null,
      cambios: { ...marcasDeTiempo('cotizada', new Date(), c), cotizadaPor: 'sistema' },
    });
    const avisar = !esCorreccion || p.avisar === true;
    return resultado(c, 'cotizada', avisar ? ['cliente_cotizacion_lista'] : []);
  });
}

export async function marcarEnviadaPorFuera(
  db: PrismaClient,
  p: { numero: number; usuarioId: string; canal: Canal; nota?: string | null },
): Promise<ResultadoCambio> {
  exigirCanalFuera(p.canal);
  return db.$transaction(async (tx) => {
    const c = await bloquear(tx, p.numero);
    await registrar(tx, c, {
      a: 'cotizada',
      usuarioId: p.usuarioId,
      canal: p.canal,
      nota: p.nota,
      cambios: { ...marcasDeTiempo('cotizada', new Date(), c), cotizadaPor: p.canal },
    });
    return resultado(c, 'cotizada', []);
  });
}

export async function cancelarPorAsesor(
  db: PrismaClient,
  p: { numero: number; usuarioId: string; motivo: string | null | undefined; canal?: Canal; nota?: string | null },
): Promise<ResultadoCambio> {
  const motivo = exigirMotivo(p.motivo);
  const canal = p.canal ?? 'sistema';
  return db.$transaction(async (tx) => {
    const c = await bloquear(tx, p.numero);
    if (c.estado === 'cancelada') throw new ConflictError('mismo_estado', 'La cotización ya está cancelada.');
    await registrar(tx, c, {
      a: 'cancelada',
      usuarioId: p.usuarioId,
      canal,
      nota: p.nota ?? motivo,
      cambios: { ...marcasDeTiempo('cancelada', new Date(), c), motivoCancelacion: motivo },
    });
    return resultado(c, 'cancelada', []);
  });
}

/**
 * Por qué canal quedan dados los precios tras «Cambiar estado» (solo «Enviar cotización» los da por el
 * sistema). Volver a recibida o en revisión lo borra; pasar a cotizada lo fija en el canal elegido,
 * para que unos precios guardados como borrador nunca queden a la vista del cliente. Confirmada o
 * entregada conservan el valor que había o, si estaba vacío, toman el canal.
 */
function cotizadaPorAlCambiar(actual: Canal | null, a: EstadoCotizacion, canal: Canal): Prisma.CotizacionUpdateInput {
  if (a === 'recibida' || a === 'en_revision') return { cotizadaPor: null };
  if (a === 'cotizada') return { cotizadaPor: canal };
  if ((a === 'confirmada' || a === 'entregada') && actual === null) return { cotizadaPor: canal };
  return {};
}

/**
 * Cambio libre del asesor: a cualquier estado, también hacia atrás, porque el
 * seguimiento puede hacerse fuera de la plataforma. Nunca manda correo.
 */
export async function cambiarEstado(
  db: PrismaClient,
  p: { numero: number; usuarioId: string; a: EstadoCotizacion; canal: Canal; nota?: string | null; motivo?: string | null },
): Promise<ResultadoCambio> {
  exigirCanalFuera(p.canal);
  if (p.a === 'cancelada') return cancelarPorAsesor(db, { numero: p.numero, usuarioId: p.usuarioId, motivo: p.motivo, canal: p.canal, nota: p.nota });
  return db.$transaction(async (tx) => {
    const c = await bloquear(tx, p.numero);
    if (c.estado === p.a) throw new ConflictError('mismo_estado', 'La cotización ya está en ese estado.');
    await registrar(tx, c, {
      a: p.a,
      usuarioId: p.usuarioId,
      canal: p.canal,
      nota: p.nota,
      cambios: { ...marcasDeTiempo(p.a, new Date(), c), ...cotizadaPorAlCambiar(c.cotizadaPor, p.a, p.canal) },
    });
    return resultado(c, p.a, []);
  });
}

/**
 * Quita la foto de una cotización entregada o cancelada sin movimientos desde `limite`.
 * Lo comprueba otra vez con la cotización bloqueada: si el asesor la movió mientras tanto, no la toca.
 * Devuelve el archivo que hay que borrar del disco, o null.
 */
export async function quitarFotoPorAntiguedad(db: PrismaClient, p: { numero: number; limite: Date }): Promise<string | null> {
  return db.$transaction(async (tx) => {
    const c = await bloquear(tx, p.numero);
    const actual = await tx.cotizacion.findUniqueOrThrow({
      where: { id: c.id },
      select: { fotoArchivo: true, creadaEn: true, cambios: { select: { creadoEn: true }, orderBy: { creadoEn: 'desc' }, take: 1 } },
    });
    const ultimoMovimiento = actual.cambios[0]?.creadoEn ?? actual.creadaEn;
    if (!actual.fotoArchivo || !ESTADOS_FOTO_SE_BORRA.includes(c.estado) || ultimoMovimiento >= p.limite) return null;
    await registrar(tx, c, { a: c.estado, usuarioId: null, canal: 'sistema', nota: NOTA_FOTO_ELIMINADA, cambios: { fotoArchivo: null } });
    return actual.fotoArchivo;
  });
}
