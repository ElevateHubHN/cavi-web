// Único punto de contacto con la API del panel: si cambia una ruta o un nombre, se ajusta aquí.
// Los nombres de estados y canales deben coincidir con api/src/dominio/cotizaciones.ts y prisma/schema.prisma.

export type Estado = 'recibida' | 'en_revision' | 'cotizada' | 'confirmada' | 'entregada' | 'cancelada';
export type Canal = 'sistema' | 'whatsapp' | 'llamada' | 'correo' | 'tienda';
export type CanalFuera = Exclude<Canal, 'sistema'>;
export type Rol = 'admin' | 'asesor';
export type EstadoCorreo = 'enviado' | 'fallido' | 'omitido' | 'pendiente' | 'reemplazado';
export type TipoCorreo =
  | 'confirmacion'
  | 'clave_temporal'
  | 'cotizacion_lista'
  | 'aviso_solicitud_nueva'
  | 'aviso_cotizacion_aceptada'
  | 'aviso_cotizacion_cancelada'
  | 'aviso_mensaje_contacto'
  | 'bienvenida_usuario_panel';

export interface UsuarioPanel {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  debeCambiarClave: boolean;
}

export interface Resumen {
  recibidas: number;
  mensajesPendientes: number;
}

export interface Entrega {
  modo: 'envio' | 'retiro';
  sucursal: string | null;
  departamento: string | null;
  ciudad: string | null;
  direccion: string | null;
  referencia: string | null;
}

export interface FilaCotizacion {
  numero: number;
  creadaEn: string;
  estado: Estado;
  cliente: { id: string; nombre: string; empresa: string | null };
  piezas: number;
  asesor: string | null;
  entrega: Pick<Entrega, 'modo' | 'sucursal' | 'ciudad'>;
  /** Suma de cantidad × precio de las piezas con precio, redondeada a 2 decimales; null si ninguna tiene precio. */
  total: number | null;
  cotizadaPor: Canal | null;
}

export type Contadores = Record<Estado | 'todas', number>;

export interface Pagina<T> {
  filas: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface ListaCotizaciones extends Pagina<FilaCotizacion> {
  /** Cuántas hay por estado con el filtro de sucursal y la búsqueda aplicados, sin el filtro de estado. */
  contadores: Contadores;
}

export interface Pieza {
  id: string;
  nombre: string;
  numeroParte: string;
  cantidad: number;
  precioUnitario: number | null;
}

export interface CambioBitacora {
  id: string;
  creadoEn: string;
  de: Estado | null;
  a: Estado;
  /** Nombre del usuario del panel; null si lo hizo el cliente o el sitio. */
  usuario: string | null;
  canal: Canal;
  nota: string | null;
}

export interface CorreoEnviado {
  id: string;
  tipo: TipoCorreo;
  para: string;
  estado: EstadoCorreo;
  /** Por qué no salió, para mostrarlo tal cual; null si salió o está saliendo. */
  motivo: string | null;
  /** Lo calcula el servidor: true si el correo no salió y todavía tiene sentido reenviarlo. */
  sePuedeReenviar: boolean;
  creadoEn: string;
}

export interface DetalleCotizacion {
  numero: number;
  creadaEn: string;
  estado: Estado;
  asesor: { id: string; nombre: string } | null;
  cotizadaPor: Canal | null;
  motivoCancelacion: string | null;
  clienteId: string;
  /** Contacto tal como lo envió el cliente en esta cotización, más el correo de su cuenta. */
  contacto: { nombre: string; telefono: string; empresa: string | null; rtn: string | null; correo: string };
  entrega: Entrega;
  equipo: string | null;
  serie: string | null;
  notas: string | null;
  conFoto: boolean;
  piezas: Pieza[];
  total: number | null;
  /** Más reciente primero. */
  bitacora: CambioBitacora[];
  correos: CorreoEnviado[];
}

export interface FilaCliente {
  id: string;
  nombre: string;
  empresa: string | null;
  correo: string;
  cotizaciones: number;
  creadoEn: string;
}

export interface DetalleCliente {
  id: string;
  nombre: string;
  empresa: string | null;
  correo: string;
  telefono: string;
  rtn: string | null;
  creadoEn: string;
  cotizaciones: FilaCotizacion[];
}

export interface Mensaje {
  id: string;
  nombre: string;
  empresa: string | null;
  correo: string;
  telefono: string;
  mensaje: string;
  creadoEn: string;
  atendidoEn: string | null;
  atendidoPor: string | null;
}

export interface Mensajes {
  pendientes: Mensaje[];
  /** Los 50 atendidos más recientes. */
  atendidos: Mensaje[];
}

export type AccionEstado =
  | { accion: 'tomar' }
  | { accion: 'fuera'; canal: CanalFuera; nota?: string }
  | { accion: 'cambiar'; a: Exclude<Estado, 'cancelada'>; canal: CanalFuera; nota?: string }
  | { accion: 'cancelar'; motivo: string; nota?: string };

export interface PreciosPayload {
  /** Precio en lempiras como texto con hasta 2 decimales ("685.00"), para no perder centavos al convertirlo. */
  precios: { itemId: string; precioUnitario: string | null }[];
  /** true: pasa a «cotizada» por el sistema (exige todas con precio). false: solo guarda. */
  enviar: boolean;
  /** Solo aplica si ya estaba cotizada por el sistema: avisa al cliente de la corrección. */
  avisar?: boolean;
}

export class ErrorApi extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ErrorApi';
  }
}

export const EVENTO_SIN_SESION = 'cavi-panel:sin-sesion';

const BASE = '/api/panel';

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + ruta, {
      method: metodo,
      credentials: 'same-origin',
      headers: cuerpo === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorApi(0, 'sin_conexion', 'No pudimos conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.');
  }
  const texto = await res.text();
  let datos: unknown = null;
  if (texto) {
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = null;
    }
  }
  if (!res.ok) {
    const err = errorDe(datos);
    if (res.status === 401 && ruta !== '/ingresar') window.dispatchEvent(new Event(EVENTO_SIN_SESION));
    throw new ErrorApi(res.status, err.code ?? 'error', err.message ?? 'Algo salió mal. Vuelve a intentarlo en un momento.');
  }
  return datos as T;
}

function errorDe(datos: unknown): { code?: string; message?: string } {
  if (typeof datos !== 'object' || datos === null || !('error' in datos)) return {};
  const e: unknown = datos.error;
  if (typeof e !== 'object' || e === null) return {};
  return {
    code: 'code' in e && typeof e.code === 'string' ? e.code : undefined,
    message: 'message' in e && typeof e.message === 'string' ? e.message : undefined,
  };
}

const consulta = (p: Record<string, string | number | undefined>): string => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
};

export const api = {
  ingresar: (correo: string, clave: string) => pedir<{ usuario: UsuarioPanel }>('POST', '/ingresar', { correo, clave }),
  salir: () => pedir<{ ok: true }>('POST', '/salir', {}),
  yo: () => pedir<UsuarioPanel>('GET', '/me'),
  cambiarClave: (datos: { actual?: string; nueva: string }) => pedir<{ ok: true }>('POST', '/me/clave', datos),
  resumen: () => pedir<Resumen>('GET', '/resumen'),

  cotizaciones: (f: { estado?: Estado; sucursal?: string; q?: string; pagina?: number }) =>
    pedir<ListaCotizaciones>('GET', `/cotizaciones${consulta(f)}`),
  cotizacion: (numero: number) => pedir<DetalleCotizacion>('GET', `/cotizaciones/${numero}`),
  precios: (numero: number, datos: PreciosPayload) => pedir<DetalleCotizacion>('PUT', `/cotizaciones/${numero}/precios`, datos),
  estado: (numero: number, accion: AccionEstado) => pedir<DetalleCotizacion>('POST', `/cotizaciones/${numero}/estado`, accion),
  reenviarAviso: (numero: number, correoId: string) =>
    pedir<DetalleCotizacion>('POST', `/cotizaciones/${numero}/reenviar-aviso`, { correoId }),
  urlFoto: (numero: number) => `${BASE}/cotizaciones/${numero}/foto`,

  clientes: (f: { q?: string; pagina?: number }) => pedir<Pagina<FilaCliente>>('GET', `/clientes${consulta(f)}`),
  cliente: (id: string) => pedir<DetalleCliente>('GET', `/clientes/${encodeURIComponent(id)}`),

  mensajes: () => pedir<Mensajes>('GET', '/mensajes'),
  atender: (id: string) => pedir<Mensaje>('POST', `/mensajes/${encodeURIComponent(id)}/atendido`, {}),

  boletin: () => pedir<{ suscriptores: number }>('GET', '/boletin'),
  urlBoletinCsv: `${BASE}/boletin.csv`,

  usuarios: () => pedir<{ filas: UsuarioPanel[] }>('GET', '/usuarios'),
  crearUsuario: (datos: { nombre: string; correo: string; rol: Rol }) => pedir<UsuarioPanel>('POST', '/usuarios', datos),
  editarUsuario: (id: string, datos: { nombre?: string; rol?: Rol; activo?: boolean; claveTemporalNueva?: true }) =>
    pedir<UsuarioPanel>('PATCH', `/usuarios/${encodeURIComponent(id)}`, datos),
};
