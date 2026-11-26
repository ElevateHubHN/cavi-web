import type { Prisma } from '@prisma/client';
import { numeroDesdeTexto } from '../dominio/cotizaciones.js';

export interface Contenido {
  asunto: string;
  html: string;
  texto: string;
  /** Correo interno (avisos o personal): lleva el pie de CAVI y no el del cliente. */
  paraCavi: boolean;
  /** Nombre visible del remitente cuando no es el de CORREO_REMITENTE. */
  nombreRemitente: string | null;
}

export interface ContextoCorreo {
  /** URL pública del sitio, sin barra final: arma el logo y los enlaces. */
  sitio: string;
  /** Correo de CAVI que se ofrece al cliente en el pie para consultas. */
  correoConsultas: string;
}

const WHATSAPP_CAVI = '+504 3176-0933';
const C = { navy: '#0B2545', red: '#E01F26', ink: '#26364F', muted: '#5B6B82', line: '#E3E8EF', soft: '#F5F7FA', green: '#1F8A4C', amber: '#966210' };
const F = "font-family:'Segoe UI',Arial,Helvetica,sans-serif;";

export const esc = (texto: string): string =>
  texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function formatoLempiras(monto: Prisma.Decimal): string {
  const [entero = '0', decimales = '00'] = monto.toFixed(2).split('.');
  return `L ${entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decimales}`;
}

const primerNombre = (nombre: string) => nombre.trim().split(/\s+/)[0] ?? '';
const conEmpresa = (nombre: string, empresa: string | null) => (empresa ? `${nombre} (${empresa})` : nombre);
const repuestos = (n: number) => (n === 1 ? '1 repuesto' : `${n} repuestos`);

const p = (t: string, extra = '') => `<p style="${F}margin:8px 0;font-size:15px;line-height:1.6;color:${C.ink};${extra}">${t}</p>`;
const h = (t: string) => `<h2 style="${F}margin:0 0 12px;font-size:20px;line-height:1.3;font-weight:700;color:${C.navy}">${t}</h2>`;

type Destino = 'cliente' | 'cavi' | 'personal';

type TipoCaja = 'info' | 'ok' | 'aviso' | 'alerta';
const COLORES_CAJA: Record<TipoCaja, [string, string]> = {
  info: [C.soft, C.navy],
  ok: ['#E9F5EE', C.green],
  aviso: ['#FDF6E7', C.amber],
  alerta: ['#FDECEC', C.red],
};
const caja = (t: string, tipo: TipoCaja = 'info') =>
  `<div style="background:${COLORES_CAJA[tipo][0]};border-left:4px solid ${COLORES_CAJA[tipo][1]};padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0;">${t}</div>`;

const boton = (t: string, href: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0"><tr><td style="background:${C.red};border-radius:8px"><a href="${esc(href)}" style="${F}display:inline-block;padding:13px 26px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px">${t}</a></td></tr></table>`;

const clave = (c: string) =>
  `<p style="${F}margin:4px 0;font-size:14px;color:${C.muted}">Clave temporal</p><p style="margin:0;font-family:Consolas,Menlo,monospace;font-size:22px;font-weight:700;letter-spacing:2px;color:${C.navy}">${esc(c)}</p>`;

type Par = [string, string | null | undefined];
const presentes = (pares: Par[]): [string, string][] => pares.flatMap(([k, v]) => (v ? [[k, v]] : []));

const filas = (pares: Par[]) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="${F}font-size:14px;color:${C.ink};margin:6px 0">${presentes(pares)
    .map(([k, v]) => `<tr><td style="padding:3px 14px 3px 0;color:${C.muted};vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:3px 0;font-weight:600">${esc(v)}</td></tr>`)
    .join('')}</table>`;

const filasTexto = (pares: Par[]) => presentes(pares).map(([k, v]) => `${k}: ${v}`).join('\n');

export interface PiezaCorreo {
  nombre: string;
  numeroParte: string;
  cantidad: number;
}

export interface PiezaConPrecio extends PiezaCorreo {
  precioUnitario: Prisma.Decimal;
}

function tablaPiezas(items: readonly PiezaCorreo[], precios?: { unitarios: readonly Prisma.Decimal[]; total: Prisma.Decimal }): string {
  const th = (alinear: 'left' | 'right') =>
    `style="${F}text-align:${alinear};font-size:12px;letter-spacing:.5px;text-transform:uppercase;color:${C.muted};padding:8px 6px;border-bottom:1px solid ${C.line}"`;
  const td = `style="${F}font-size:14px;color:${C.ink};padding:9px 6px;border-bottom:1px solid ${C.line};vertical-align:top"`;
  const tdr = `style="${F}font-size:14px;color:${C.ink};padding:9px 6px;border-bottom:1px solid ${C.line};text-align:right;white-space:nowrap;vertical-align:top"`;
  const filasHtml = items
    .map((i, k) => {
      const unitario = precios?.unitarios[k];
      const columnasPrecio = unitario
        ? `<td ${tdr}>${esc(formatoLempiras(unitario))}</td><td ${tdr}><strong>${esc(formatoLempiras(unitario.times(i.cantidad)))}</strong></td>`
        : '';
      return `<tr><td ${td}><strong>${esc(i.nombre)}</strong><br><span style="font-family:Consolas,Menlo,monospace;font-size:12px;color:${C.muted}">N° ${esc(i.numeroParte)}</span></td><td ${tdr}>× ${i.cantidad}</td>${columnasPrecio}</tr>`;
    })
    .join('');
  const encabezadoPrecio = precios ? `<th ${th('right')}>Precio</th><th ${th('right')}>Subtotal</th>` : '';
  const filaTotal = precios
    ? `<tr><td colspan="3" style="${F}padding:12px 6px;text-align:right;font-size:14px;color:${C.muted}">Total</td><td style="${F}padding:12px 6px;text-align:right;font-size:20px;font-weight:800;color:${C.navy};white-space:nowrap">${esc(formatoLempiras(precios.total))}</td></tr>`
    : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:10px 0"><tr><th ${th('left')}>Repuesto</th><th ${th('right')}>Cant.</th>${encabezadoPrecio}</tr>${filasHtml}${filaTotal}</table>`;
}

function piezasTexto(items: readonly PiezaCorreo[], unitarios?: readonly Prisma.Decimal[]): string {
  return items
    .map((i, k) => {
      const u = unitarios?.[k];
      return `- ${i.nombre} (N° ${i.numeroParte}) × ${i.cantidad}${u ? ` · ${formatoLempiras(u)} c/u · ${formatoLempiras(u.times(i.cantidad))}` : ''}`;
    })
    .join('\n');
}

function marco(ctx: ContextoCorreo, cuerpo: string, paraCavi: boolean): string {
  const pie = paraCavi
    ? 'Aviso automático del sitio de Repuestos CAVI. Lo recibes porque este correo está configurado para los avisos del panel.'
    : `Este es un mensaje automático de Repuestos CAVI; no respondas a este correo.<br>¿Dudas? Escríbenos por WhatsApp al <strong style="color:${C.navy}">${WHATSAPP_CAVI}</strong> o a <strong style="color:${C.navy}">${esc(ctx.correoConsultas)}</strong>.`;
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border-collapse:collapse;box-shadow:0 2px 8px rgba(11,37,69,.06)">` +
    `<tr><td style="padding:24px 28px;text-align:center;background:#ffffff"><img src="${esc(ctx.sitio)}/logo-cavi-correo.png" width="220" alt="Repuestos CAVI" style="display:block;margin:0 auto;max-width:220px;height:auto;border:0"></td></tr>` +
    `<tr><td style="height:4px;background:${C.red};font-size:0;line-height:0">&nbsp;</td></tr>` +
    `<tr><td style="padding:30px 28px">${cuerpo}</td></tr>` +
    `<tr><td style="padding:18px 28px;background:#FAFBFC;border-top:1px solid #EEF1F5;text-align:center"><p style="${F}margin:0 0 6px;font-size:12px;line-height:1.6;color:#8A97AB">${pie}</p><p style="${F}margin:0;font-size:11px;color:#9AA7BA">Repuestos CAVI · San Pedro Sula · El Progreso · Puerto Cortés · Tegucigalpa</p></td></tr></table>`
  );
}

function pieTexto(ctx: ContextoCorreo, paraCavi: boolean): string {
  return paraCavi
    ? '\n\n--\nAviso automático del sitio de Repuestos CAVI.'
    : `\n\n--\nEste es un mensaje automático de Repuestos CAVI; no respondas a este correo.\n¿Dudas? Escríbenos por WhatsApp al ${WHATSAPP_CAVI} o a ${ctx.correoConsultas}.`;
}

function armar(ctx: ContextoCorreo, asunto: string, cuerpo: string, texto: string, destino: Destino): Contenido {
  const paraCavi = destino !== 'cliente';
  return { asunto, html: marco(ctx, cuerpo, paraCavi), texto: texto + pieTexto(ctx, paraCavi), paraCavi, nombreRemitente: destino === 'cavi' ? 'Sitio de CAVI' : null };
}

/** Enlace al detalle en el panel, con el número solo («1042»), igual que los enlaces de la lista. */
export const enlacePanelCotizacion = (ctx: ContextoCorreo, numero: string) =>
  `${ctx.sitio}/panel/cotizaciones/${encodeURIComponent(String(numeroDesdeTexto(numero) ?? numero))}`;

export function confirmacion(ctx: ContextoCorreo, d: { nombre: string; enlace: string; claveTemporal: string; numero: string | null }): Contenido {
  const asunto = d.numero ? `Confirma tu correo para seguir tu cotización ${d.numero}` : 'Confirma tu correo para entrar a tu portal de CAVI';
  const saludo = `Hola, ${primerNombre(d.nombre)}`;
  const recibida = d.numero ? `Recibimos tu solicitud de cotización <strong>${esc(d.numero)}</strong>. Un asesor de CAVI ya la tiene en su lista.` : null;
  const cuerpo =
    h(esc(saludo)) +
    (recibida ? p(recibida) : '') +
    p('Confirma tu correo para activar tu portal de clientes, donde vas a ver el estado de tu cotización y los precios cuando estén listos.') +
    boton('Confirmar mi correo', d.enlace) +
    caja(clave(d.claveTemporal) + p('Úsala para entrar por primera vez. Ahí te pediremos crear tu propia clave.', 'font-size:13.5px;margin:10px 0 0')) +
    p('El enlace vence en 24 horas. Si no pediste una cotización en CAVI, ignora este correo.', `font-size:13px;color:${C.muted}`);
  const texto =
    `${saludo}\n\n` +
    (d.numero ? `Recibimos tu solicitud de cotización ${d.numero}. Un asesor de CAVI ya la tiene en su lista.\n\n` : '') +
    'Confirma tu correo para activar tu portal de clientes, donde vas a ver el estado de tu cotización y los precios cuando estén listos.\n\n' +
    `Confirmar mi correo: ${d.enlace}\n\n` +
    `Clave temporal: ${d.claveTemporal}\nÚsala para entrar por primera vez. Ahí te pediremos crear tu propia clave.\n\n` +
    'El enlace vence en 24 horas. Si no pediste una cotización en CAVI, ignora este correo.';
  return armar(ctx, asunto, cuerpo, texto, 'cliente');
}

export function claveTemporal(ctx: ContextoCorreo, d: { nombre: string; claveTemporal: string }): Contenido {
  const asunto = 'Tu clave temporal para entrar al portal de CAVI';
  const saludo = `Hola, ${primerNombre(d.nombre)}`;
  const enlace = `${ctx.sitio}/portal`;
  const cuerpo =
    h(esc(saludo)) +
    p('Pediste recuperar el acceso a tu portal de clientes. Entra con esta clave temporal y crea una nueva.') +
    caja(clave(d.claveTemporal)) +
    boton('Ingresar a mi portal', enlace) +
    caja(p('Si no fuiste tú, ignora este correo: tu clave actual sigue funcionando. La clave temporal vence en 24 horas.', 'font-size:13.5px;margin:0'), 'aviso');
  const texto =
    `${saludo}\n\nPediste recuperar el acceso a tu portal de clientes. Entra con esta clave temporal y crea una nueva.\n\n` +
    `Clave temporal: ${d.claveTemporal}\n\nIngresar a mi portal: ${enlace}\n\n` +
    'Si no fuiste tú, ignora este correo: tu clave actual sigue funcionando. La clave temporal vence en 24 horas.';
  return armar(ctx, asunto, cuerpo, texto, 'cliente');
}

export function cotizacionLista(
  ctx: ContextoCorreo,
  d: { nombre: string; numero: string; asesor: string | null; piezas: readonly PiezaConPrecio[]; total: Prisma.Decimal; entrega: string },
): Contenido {
  const total = formatoLempiras(d.total);
  const asunto = `Tu cotización ${d.numero} está lista: ${total}`;
  const enlace = `${ctx.sitio}/portal/cotizacion?id=${encodeURIComponent(d.numero)}`;
  const quien = d.asesor ?? 'Un asesor de CAVI';
  const intro = `Hola, ${primerNombre(d.nombre)}. ${quien} revisó tu solicitud. Estos son los precios y la disponibilidad:`;
  const unitarios = d.piezas.map((i) => i.precioUnitario);
  const cierre = 'Al aceptarla, un asesor te contacta para coordinar el pago y la entrega. Puedes pagar por transferencia, con tarjeta o contra entrega.';
  const cuerpo =
    h(esc(`Tu cotización ${d.numero} está lista`)) +
    p(esc(intro)) +
    tablaPiezas(d.piezas, { unitarios, total: d.total }) +
    filas([['Entrega', d.entrega]]) +
    boton('Ver y aceptar en mi portal', enlace) +
    p(cierre, 'font-size:14px');
  const texto =
    `Tu cotización ${d.numero} está lista\n\n${intro}\n\n${piezasTexto(d.piezas, unitarios)}\n\nTotal: ${total}\n` +
    `${filasTexto([['Entrega', d.entrega]])}\n\nVer y aceptar en mi portal: ${enlace}\n\n${cierre}`;
  return armar(ctx, asunto, cuerpo, texto, 'cliente');
}

export interface DatosAvisoSolicitud {
  numero: string;
  nombre: string;
  empresa: string | null;
  correo: string;
  telefono: string;
  rtn: string | null;
  entrega: string;
  equipo: string | null;
  serie: string | null;
  notas: string | null;
  conFoto: boolean;
  piezas: readonly PiezaCorreo[];
}

export function avisoSolicitudNueva(ctx: ContextoCorreo, d: DatosAvisoSolicitud): Contenido {
  const asunto = `Solicitud nueva ${d.numero} · ${d.nombre} · ${repuestos(d.piezas.length)}`;
  const vehiculo = [d.equipo, d.serie ? `serie ${d.serie}` : null, d.conFoto ? 'con foto' : null].filter(Boolean).join(' · ');
  const pares: Par[] = [
    ['Cliente', d.nombre],
    ['Empresa', d.empresa],
    ['Teléfono', d.telefono],
    ['Correo', d.correo],
    ['RTN', d.rtn],
    ['Entrega', d.entrega],
    ['Vehículo', vehiculo],
  ];
  const enlace = enlacePanelCotizacion(ctx, d.numero);
  const cuerpo =
    h(esc(`Solicitud nueva ${d.numero}`)) +
    p('Entró una solicitud de cotización desde el sitio.') +
    filas(pares) +
    tablaPiezas(d.piezas) +
    (d.notas ? caja(p(`<strong>Nota del cliente:</strong> ${esc(d.notas)}`, 'margin:0;font-size:14px')) : '') +
    boton('Abrir en el panel', enlace);
  const texto =
    `Solicitud nueva ${d.numero}\n\nEntró una solicitud de cotización desde el sitio.\n\n${filasTexto(pares)}\n\n${piezasTexto(d.piezas)}\n` +
    (d.notas ? `\nNota del cliente: ${d.notas}\n` : '') +
    `\nAbrir en el panel: ${enlace}`;
  return armar(ctx, asunto, cuerpo, texto, 'cavi');
}

export function avisoCotizacionAceptada(
  ctx: ContextoCorreo,
  d: { numero: string; nombre: string; empresa: string | null; telefono: string; entrega: string; asesor: string | null; total: string | null },
): Contenido {
  const asunto = `${d.numero} aceptada por ${d.nombre}${d.total ? ` · ${d.total}` : ''}`;
  const enlace = enlacePanelCotizacion(ctx, d.numero);
  const resumenHtml = `<strong>${esc(d.nombre)}</strong>${d.empresa ? ` (${esc(d.empresa)})` : ''} aceptó la cotización${d.total ? ` por <strong>${esc(d.total)}</strong>` : ''}.`;
  const resumenTexto = `${conEmpresa(d.nombre, d.empresa)} aceptó la cotización${d.total ? ` por ${d.total}` : ''}.`;
  const pares: Par[] = [
    ['Teléfono', d.telefono],
    ['Entrega', d.entrega],
    ['Atiende', d.asesor],
  ];
  const indicacion = 'Coordina con el cliente el pago y la entrega por WhatsApp. Cuando la entregues, márcala en el panel.';
  const cuerpo =
    h(esc(`El cliente aceptó la cotización ${d.numero}`)) +
    caja(p(resumenHtml, 'margin:0;font-size:14.5px'), 'ok') +
    filas(pares) +
    p(indicacion) +
    boton('Abrir en el panel', enlace);
  const texto = `El cliente aceptó la cotización ${d.numero}\n\n${resumenTexto}\n\n${filasTexto(pares)}\n\n${indicacion}\n\nAbrir en el panel: ${enlace}`;
  return armar(ctx, asunto, cuerpo, texto, 'cavi');
}

export function avisoCotizacionCancelada(
  ctx: ContextoCorreo,
  d: { numero: string; nombre: string; empresa: string | null; comentario: string | null; estabaEn: string; asesor: string | null },
): Contenido {
  const asunto = `${d.numero} cancelada por el cliente · ${d.nombre}`;
  const enlace = enlacePanelCotizacion(ctx, d.numero);
  const resumenHtml =
    `<strong>${esc(d.nombre)}</strong>${d.empresa ? ` (${esc(d.empresa)})` : ''} la canceló desde su portal.` +
    (d.comentario ? `<br>Comentario: «${esc(d.comentario)}».` : '');
  const resumenTexto = `${conEmpresa(d.nombre, d.empresa)} la canceló desde su portal.` + (d.comentario ? `\nComentario: «${d.comentario}».` : '');
  const pares: Par[] = [
    ['Estaba en', d.estabaEn],
    ['Atiende', d.asesor],
  ];
  const indicacion = 'Si fue un error, puedes reactivarla desde el panel con «Cambiar estado».';
  const cuerpo =
    h(esc(`El cliente canceló la cotización ${d.numero}`)) +
    caja(p(resumenHtml, 'margin:0;font-size:14.5px'), 'alerta') +
    filas(pares) +
    p(indicacion, 'font-size:14px') +
    boton('Abrir en el panel', enlace);
  const texto = `El cliente canceló la cotización ${d.numero}\n\n${resumenTexto}\n\n${filasTexto(pares)}\n\n${indicacion}\n\nAbrir en el panel: ${enlace}`;
  return armar(ctx, asunto, cuerpo, texto, 'cavi');
}

export function avisoMensajeContacto(
  ctx: ContextoCorreo,
  d: { nombre: string; empresa: string | null; correo: string; telefono: string; mensaje: string },
): Contenido {
  const asunto = `Mensaje del sitio · ${conEmpresa(d.nombre, d.empresa)}`;
  const enlace = `${ctx.sitio}/panel/mensajes`;
  const pares: Par[] = [
    ['Nombre', d.nombre],
    ['Empresa', d.empresa],
    ['Teléfono', d.telefono],
    ['Correo', d.correo],
  ];
  const indicacion = 'Responde este correo para contestarle, o escríbele por WhatsApp. Después márcalo como atendido en el panel.';
  const cuerpo =
    h('Mensaje nuevo desde el sitio') +
    caja(p(`«${esc(d.mensaje)}»`, 'margin:0;font-size:15px;font-style:italic;white-space:pre-wrap')) +
    filas(pares) +
    p(indicacion, 'font-size:14px') +
    boton('Ver mensajes en el panel', enlace);
  const texto = `Mensaje nuevo desde el sitio\n\n«${d.mensaje}»\n\n${filasTexto(pares)}\n\n${indicacion}\n\nVer mensajes en el panel: ${enlace}`;
  return armar(ctx, asunto, cuerpo, texto, 'cavi');
}

export function bienvenidaUsuarioPanel(
  ctx: ContextoCorreo,
  d: { nombre: string; correo: string; claveTemporal: string; rol: 'admin' | 'asesor'; invitadoPor: string | null },
): Contenido {
  const asunto = 'Tu acceso al panel de cotizaciones de CAVI';
  const saludo = `Hola, ${primerNombre(d.nombre)}`;
  const enlace = `${ctx.sitio}/panel`;
  const rol = d.rol === 'admin' ? 'administrador' : 'asesor';
  const quien = d.invitadoPor ? `${d.invitadoPor} te dio` : 'Te dieron';
  const intro = `${quien} acceso al panel de cotizaciones de CAVI como`;
  const tarea = 'Ahí vas a ver las solicitudes que llegan del sitio, poner precios y dar seguimiento.';
  const cuerpo =
    h(esc(saludo)) +
    p(`${esc(intro)} <strong>${rol}</strong>. ${tarea}`) +
    caja(filas([['Correo', d.correo]]) + clave(d.claveTemporal)) +
    boton('Ingresar al panel', enlace) +
    p('Al entrar por primera vez te pediremos crear tu propia clave.', 'font-size:14px');
  const texto =
    `${saludo}\n\n${intro} ${rol}. ${tarea}\n\nCorreo: ${d.correo}\nClave temporal: ${d.claveTemporal}\n\n` +
    `Ingresar al panel: ${enlace}\n\nAl entrar por primera vez te pediremos crear tu propia clave.`;
  return armar(ctx, asunto, cuerpo, texto, 'personal');
}
