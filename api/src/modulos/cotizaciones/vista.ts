import type { Prisma } from '@prisma/client';
import { ESTADOS, formatoNumero, preciosVisiblesParaCliente, totalDe } from '../../dominio/cotizaciones.js';

export const SELECT_VISTA = {
  id: true,
  numero: true,
  estado: true,
  creadaEn: true,
  nombre: true,
  telefono: true,
  empresa: true,
  rtn: true,
  modoEntrega: true,
  departamento: true,
  ciudad: true,
  direccion: true,
  referencia: true,
  sucursal: true,
  equipo: true,
  serie: true,
  notas: true,
  fotoArchivo: true,
  cotizadaPor: true,
  motivoCancelacion: true,
  items: { select: { productoId: true, nombre: true, numeroParte: true, cantidad: true, precioUnitario: true }, orderBy: { orden: 'asc' } },
} satisfies Prisma.CotizacionSelect;

export type FilaVista = Prisma.CotizacionGetPayload<{ select: typeof SELECT_VISTA }>;

/** Lo que ve el cliente en su portal: los precios solo cuando el asesor los envió por el sistema. */
export function vistaCliente(c: FilaVista) {
  const conPrecios = preciosVisiblesParaCliente(c);
  const cotizadaPorFuera = c.cotizadaPor !== null && c.cotizadaPor !== 'sistema' && ESTADOS.indexOf(c.estado) >= ESTADOS.indexOf('cotizada') && c.estado !== 'cancelada';
  return {
    numero: formatoNumero(c.numero),
    creadaEn: c.creadaEn.toISOString(),
    estado: c.estado,
    contacto: { nombre: c.nombre, telefono: c.telefono, empresa: c.empresa, rtn: c.rtn },
    entrega:
      c.modoEntrega === 'envio'
        ? { modo: c.modoEntrega, departamento: c.departamento, ciudad: c.ciudad, direccion: c.direccion, referencia: c.referencia, sucursal: null }
        : { modo: c.modoEntrega, departamento: null, ciudad: null, direccion: null, referencia: null, sucursal: c.sucursal },
    equipo: c.equipo,
    serie: c.serie,
    notas: c.notas,
    conFoto: c.fotoArchivo !== null,
    piezas: c.items.map((i) => ({
      productoId: i.productoId,
      nombre: i.nombre,
      numeroParte: i.numeroParte,
      cantidad: i.cantidad,
      precioUnitario: conPrecios && i.precioUnitario ? i.precioUnitario.toNumber() : null,
    })),
    total: conPrecios ? totalDe(c.items).toNumber() : null,
    cotizadaPor: cotizadaPorFuera ? c.cotizadaPor : null,
    motivoCancelacion: c.estado === 'cancelada' ? c.motivoCancelacion : null,
  };
}

export function describirEntrega(c: Pick<FilaVista, 'modoEntrega' | 'sucursal' | 'direccion' | 'ciudad' | 'departamento' | 'referencia'>): string {
  if (c.modoEntrega === 'retiro') return `Retiro en ${c.sucursal ?? 'sucursal sin indicar'}`;
  const lugar = [c.ciudad, c.departamento].filter(Boolean).join(', ');
  return [`Envío a ${lugar}`, c.direccion, c.referencia].filter(Boolean).join(' · ');
}
