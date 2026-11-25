import type { Canal, EstadoCotizacion, Prisma } from '@prisma/client';
import { ETIQUETA_ESTADO, MOTIVO_CANCELADA_POR_CLIENTE, formatoNumero, preciosVisiblesParaCliente, totalDe } from '../../dominio/cotizaciones.js';
import type { Correos, Envio } from '../../correos/correos.js';
import {
  avisoCotizacionAceptada,
  avisoCotizacionCancelada,
  avisoSolicitudNueva,
  cotizacionLista,
  formatoLempiras,
  type PiezaConPrecio,
} from '../../correos/plantillas.js';
import { SELECT_VISTA, describirEntrega } from './vista.js';

/** Lo que hace falta para armar cualquier correo de una cotización. */
export const SELECT_AVISO = {
  ...SELECT_VISTA,
  cliente: { select: { correo: true } },
  asesor: { select: { nombre: true } },
} satisfies Prisma.CotizacionSelect;

export type FilaAviso = Prisma.CotizacionGetPayload<{ select: typeof SELECT_AVISO }>;

const POR_FUERA: Record<Canal, string> = {
  sistema: '',
  whatsapp: 'enviada por WhatsApp',
  llamada: 'dada por llamada',
  correo: 'enviada por correo',
  tienda: 'dada en tienda',
};

export function estadoAnterior(de: EstadoCotizacion, cotizadaPor: Canal | null): string {
  const fuera = de === 'cotizada' && cotizadaPor && cotizadaPor !== 'sistema' ? ` (${POR_FUERA[cotizadaPor]})` : '';
  return `${ETIQUETA_ESTADO[de]}${fuera}`;
}

export function envioSolicitudNueva(correos: Correos, c: FilaAviso): Envio {
  return {
    tipo: 'aviso_solicitud_nueva',
    para: correos.avisos,
    cotizacionId: c.id,
    responderA: c.cliente.correo,
    contenido: avisoSolicitudNueva(correos.ctx, {
      numero: formatoNumero(c.numero),
      nombre: c.nombre,
      empresa: c.empresa,
      correo: c.cliente.correo,
      telefono: c.telefono,
      rtn: c.rtn,
      entrega: describirEntrega(c),
      equipo: c.equipo,
      serie: c.serie,
      notas: c.notas,
      conFoto: c.fotoArchivo !== null,
      piezas: c.items,
    }),
  };
}

export function envioCotizacionAceptada(correos: Correos, c: FilaAviso): Envio {
  return {
    tipo: 'aviso_cotizacion_aceptada',
    para: correos.avisos,
    cotizacionId: c.id,
    responderA: c.cliente.correo,
    contenido: avisoCotizacionAceptada(correos.ctx, {
      numero: formatoNumero(c.numero),
      nombre: c.nombre,
      empresa: c.empresa,
      telefono: c.telefono,
      entrega: describirEntrega(c),
      asesor: c.asesor?.nombre ?? null,
      total: preciosVisiblesParaCliente(c) ? formatoLempiras(totalDe(c.items)) : null,
    }),
  };
}

export function envioCotizacionCancelada(correos: Correos, c: FilaAviso, d: { comentario: string | null; de: EstadoCotizacion }): Envio {
  return {
    tipo: 'aviso_cotizacion_cancelada',
    para: correos.avisos,
    cotizacionId: c.id,
    responderA: c.cliente.correo,
    contenido: avisoCotizacionCancelada(correos.ctx, {
      numero: formatoNumero(c.numero),
      nombre: c.nombre,
      empresa: c.empresa,
      comentario: d.comentario,
      estabaEn: estadoAnterior(d.de, c.cotizadaPor),
      asesor: c.asesor?.nombre ?? null,
    }),
  };
}

/** El comentario que dejó el cliente al cancelar, leído del motivo que guarda el dominio. */
export function comentarioDelCliente(motivo: string | null): string | null {
  if (!motivo?.startsWith(MOTIVO_CANCELADA_POR_CLIENTE)) return null;
  return motivo.slice(MOTIVO_CANCELADA_POR_CLIENTE.length).replace(/^:\s*/, '') || null;
}

/** Correo al cliente con los precios del sistema; null si el cliente todavía no puede verlos. */
export function envioCotizacionLista(correos: Correos, c: FilaAviso): Envio | null {
  if (!preciosVisiblesParaCliente(c)) return null;
  const piezas: PiezaConPrecio[] = [];
  for (const i of c.items) {
    if (!i.precioUnitario) return null;
    piezas.push({ nombre: i.nombre, numeroParte: i.numeroParte, cantidad: i.cantidad, precioUnitario: i.precioUnitario });
  }
  return {
    tipo: 'cotizacion_lista',
    para: c.cliente.correo,
    cotizacionId: c.id,
    contenido: cotizacionLista(correos.ctx, {
      nombre: c.nombre,
      numero: formatoNumero(c.numero),
      asesor: c.asesor?.nombre ?? null,
      piezas,
      total: totalDe(c.items),
      entrega: describirEntrega(c),
    }),
  };
}
