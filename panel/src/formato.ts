import type { CambioBitacora, Canal, Estado, FilaCotizacion, TipoCorreo } from './api';

export const ETIQUETA_ESTADO: Record<Estado, string> = {
  recibida: 'Recibida',
  en_revision: 'En revisión',
  cotizada: 'Cotizada',
  confirmada: 'Confirmada',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
};

export const ORDEN_ESTADOS: readonly Exclude<Estado, 'cancelada'>[] = ['recibida', 'en_revision', 'cotizada', 'confirmada', 'entregada'];

export const CANALES_FUERA = [
  { valor: 'whatsapp', etiqueta: 'WhatsApp' },
  { valor: 'llamada', etiqueta: 'Llamada' },
  { valor: 'correo', etiqueta: 'Correo' },
  { valor: 'tienda', etiqueta: 'En tienda' },
] as const;

export const ETIQUETA_CANAL: Record<Canal, string> = {
  sistema: 'el sistema',
  whatsapp: 'WhatsApp',
  llamada: 'llamada',
  correo: 'correo',
  tienda: 'la tienda',
};

export const ETIQUETA_CORREO: Record<TipoCorreo, string> = {
  confirmacion: 'Confirmación de cuenta',
  clave_temporal: 'Clave temporal',
  cotizacion_lista: 'Cotización lista',
  aviso_solicitud_nueva: 'Aviso a CAVI',
  aviso_cotizacion_aceptada: 'Aceptación (a CAVI)',
  aviso_cotizacion_cancelada: 'Cancelación del cliente (a CAVI)',
  aviso_mensaje_contacto: 'Mensaje de contacto (a CAVI)',
  bienvenida_usuario_panel: 'Bienvenida al panel',
};

/** Deben coincidir con las sucursales del formulario del sitio (web/lib/company.ts), en formato «nombre · ciudad». */
export const SUCURSALES = [
  'Casa Matriz · San Pedro Sula',
  'Sucursal El Progreso · El Progreso, Yoro',
  'Sucursal El Porvenir · Puerto Cortés',
  'Sucursal La Laguna · Tegucigalpa',
  'Sucursal La Cañada · Tegucigalpa',
];

export const MOTIVOS_CANCELACION = [
  'Sin existencia en ninguna sucursal',
  'El cliente no respondió',
  'El cliente compró en otro lugar',
  'Solicitud duplicada',
  'Otro',
];

export const numeroCT = (n: number): string => `CT-${n}`;

/** «L 45,090.50» a partir de centavos enteros. */
export function lempirasDeCentavos(centavos: number): string {
  const negativo = centavos < 0;
  const abs = Math.abs(Math.round(centavos));
  const enteros = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const dec = String(abs % 100).padStart(2, '0');
  return `${negativo ? '-' : ''}L ${enteros}.${dec}`;
}

export const centavos = (lempiras: number): number => Math.round(lempiras * 100);

export const lempiras = (valor: number): string => lempirasDeCentavos(centavos(valor));

/**
 * Lee lo que el asesor escribió en un campo de precio. Acepta «1,234.5» o «1234.50».
 * Devuelve los centavos, o null si está vacío o no es un precio válido mayor que cero.
 */
export function leerPrecio(texto: string): number | null {
  const limpio = texto.replace(/,/g, '').trim();
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(limpio)) return null;
  const [ent = '0', dec = ''] = limpio.split('.');
  const c = Number(ent) * 100 + Number(dec.padEnd(2, '0'));
  return c > 0 ? c : null;
}

export const precioATexto = (c: number): string => `${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const ZONA = 'America/Tegucigalpa';

function partes(iso: string) {
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const v = (t: string) => f.find((p) => p.type === t)?.value ?? '';
  return { dia: Number(v('day')), mes: MESES[Number(v('month')) - 1] ?? '', anio: v('year'), hora: Number(v('hour')), min: v('minute') };
}

/** «25 nov 2026» */
export function fecha(iso: string): string {
  const p = partes(iso);
  return `${p.dia} ${p.mes} ${p.anio}`;
}

/** «25 nov 2026, 9:42» */
export function fechaHora(iso: string): string {
  const p = partes(iso);
  return `${p.dia} ${p.mes} ${p.anio}, ${p.hora}:${p.min}`;
}

/** «25 nov, 9:42» */
export function fechaCorta(iso: string): string {
  const p = partes(iso);
  return `${p.dia} ${p.mes}, ${p.hora}:${p.min}`;
}

export const sucursalCorta = (s: string): string => s.split(' · ')[0] ?? s;

export function entregaCorta(e: FilaCotizacion['entrega']): string {
  return e.modo === 'retiro' ? sucursalCorta(e.sucursal ?? 'Retiro en tienda') : `Envío · ${e.ciudad ?? ''}`;
}

/** Lo que el panel muestra como total: el monto si se cotizó por el sistema, o por dónde se envió. */
export function textoTotal(c: Pick<FilaCotizacion, 'estado' | 'cotizadaPor' | 'total'>): { texto: string; conPrecio: boolean } {
  const avanzada = c.estado === 'cotizada' || c.estado === 'confirmada' || c.estado === 'entregada';
  if (avanzada && c.cotizadaPor === 'sistema' && c.total !== null) return { texto: lempiras(c.total), conPrecio: true };
  if (avanzada && c.cotizadaPor && c.cotizadaPor !== 'sistema') return { texto: `Por ${ETIQUETA_CANAL[c.cotizadaPor]}`, conPrecio: false };
  return { texto: 'Sin precio', conPrecio: false };
}

/** Texto de una línea de la bitácora. */
export function textoCambio(c: CambioBitacora, nombreCliente: string): string {
  const quien = c.usuario ?? nombreCliente;
  const por = c.canal === 'sistema' ? '' : c.canal === 'tienda' ? ' · en tienda' : ` · por ${ETIQUETA_CANAL[c.canal]}`;
  const nota = c.nota ? ` · ${c.nota}` : '';
  if (c.de === null) return 'Solicitud recibida desde el sitio';
  if (c.usuario === null) {
    if (c.a === 'confirmada') return `${quien} aceptó la cotización en su portal`;
    if (c.a === 'cancelada') return `${quien} la canceló desde su portal${nota}`;
  }
  if (c.a === 'cancelada') return `${quien} la canceló: ${c.nota ?? ''}`.trim();
  if (c.de === c.a && c.a === 'cotizada') return `${quien} corrigió los precios`;
  if (c.de === 'recibida' && c.a === 'en_revision' && c.canal === 'sistema') return `${quien} la tomó`;
  if (c.a === 'cotizada' && c.canal === 'sistema') return `${quien} envió la cotización`;
  if (c.a === 'cotizada') return `${quien} la marcó cotizada${por}${nota}`;
  if (c.a === 'confirmada') return `${quien} la marcó confirmada${por}${nota}`;
  if (c.a === 'entregada') return `${quien} la marcó entregada${por}${nota}`;
  return `${quien} la pasó de ${c.de ? ETIQUETA_ESTADO[c.de] : '—'} a ${ETIQUETA_ESTADO[c.a]}${por}${nota}`;
}

/** Enlace de WhatsApp con el número del cliente; los números de 8 dígitos son de Honduras (+504). */
export function enlaceWhatsApp(telefono: string): string | null {
  const digitos = telefono.replace(/\D/g, '');
  if (digitos.length < 8) return null;
  return `https://wa.me/${digitos.length === 8 ? `504${digitos}` : digitos}`;
}
