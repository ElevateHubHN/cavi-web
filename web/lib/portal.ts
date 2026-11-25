/**
 * Acceso del sitio al servidor de CAVI (`/api`): cuenta del cliente, sesión,
 * solicitudes de cotización, contacto y boletín.
 *
 * La sesión es una cookie httpOnly que pone el servidor; el sitio nunca ve el
 * token ni la clave temporal. Ningún componente llama a `/api` por su cuenta:
 * todo pasa por aquí.
 */

/* ------------------------------------------------------------------ *
 * Tipos
 * ------------------------------------------------------------------ */

export type ShippingAddress = {
  department: string;
  city: string;
  address: string;
  reference?: string;
};

/** Entrega de la última cotización del cliente, para precargar la siguiente. */
export type LastDelivery = {
  /** Cotización de la que sale, p. ej. "CT-1048". */
  quoteId: string;
  mode: "envio" | "retiro";
  /** Solo si la última fue retiro. */
  branch?: string;
  /** Última dirección de envío que usó, aunque la última cotización haya sido retiro. */
  lastShipping?: ShippingAddress;
};

export type Account = {
  name: string;
  email: string;
  phone: string;
  company?: string;
  /** Registro Tributario Nacional, opcional, para facturación. */
  rtn?: string;
  emailVerified: boolean;
  /** La clave actual es temporal: hay que crear una propia antes de ver el portal. */
  mustChangePassword: boolean;
  /** null si el cliente todavía no tiene cotizaciones. */
  lastDelivery: LastDelivery | null;
};

export type LoginResult =
  | { ok: true; mustChangePassword: boolean }
  | { ok: false; reason: "invalid" | "unverified" };

export type PasswordResult = { ok: true } | { ok: false; error: string };

export const MIN_PASSWORD_LENGTH = 8;

/** La foto del vehículo que acepta el servidor. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type QuoteStatus =
  | "recibida"
  | "en_revision"
  | "cotizada"
  | "confirmada"
  | "entregada"
  | "cancelada";

/** Por dónde envió el asesor los precios cuando no los cargó en el portal. */
export type QuoteChannel = "whatsapp" | "llamada" | "correo" | "tienda";

export type QuoteItem = {
  productId: string;
  name: string;
  part: string;
  qty: number;
  /** Solo cuando el asesor cargó los precios en el portal. */
  unitPrice?: number;
};

export type QuoteDelivery = {
  mode: "envio" | "retiro";
  department?: string;
  city?: string;
  address?: string;
  reference?: string;
  /** Solo en "retiro", p. ej. "Casa Matriz · San Pedro Sula". */
  branch?: string;
};

export type Quote = {
  /** Número legible, p. ej. "CT-1042". */
  id: string;
  createdAt: number;
  status: QuoteStatus;
  items: QuoteItem[];
  delivery: QuoteDelivery;
  equipment?: string;
  serial?: string;
  notes?: string;
  hasPhoto: boolean;
  /** Total en Lempiras; solo cuando el asesor cargó los precios en el portal. */
  total?: number;
  /** El asesor envió los precios fuera del portal (WhatsApp, llamada, etc.). */
  quotedVia?: QuoteChannel;
  /** Solo en "cancelada". */
  cancelReason?: string;
};

export type QuoteRequest = {
  name: string;
  /** Sin sesión es obligatorio; con sesión manda el correo de la cuenta. */
  email?: string;
  phone: string;
  company?: string;
  rtn?: string;
  items: Omit<QuoteItem, "unitPrice">[];
  delivery: QuoteDelivery;
  equipment?: string;
  serial?: string;
  notes?: string;
};

export type QuoteRequestResult = {
  quoteId: string;
  email: string;
  /** El servidor usó la sesión abierta: la cotización ya está en el portal. */
  inPortal: boolean;
};

export type ContactMessage = {
  name: string;
  company?: string;
  email: string;
  phone: string;
  message: string;
};

/* ------------------------------------------------------------------ *
 * Estados: etiqueta, orden y colores del badge
 * ------------------------------------------------------------------ */

/** Orden del flujo comercial; lo usa la línea de tiempo del detalle. */
export const QUOTE_STATUS_ORDER: QuoteStatus[] = [
  "recibida",
  "en_revision",
  "cotizada",
  "confirmada",
  "entregada",
];

/** Estados desde los que el cliente puede decir «Ya no la necesito». */
export const CANCELLABLE_STATUSES: QuoteStatus[] = ["recibida", "en_revision", "cotizada"];

export const QUOTE_STATUS_META: Record<
  QuoteStatus,
  { label: string; badge: string; hint: string }
> = {
  recibida: {
    label: "Recibida",
    badge: "border-line-2 bg-soft-2 text-muted",
    hint: "Tu solicitud llegó a CAVI. Un asesor la tomará en breve.",
  },
  en_revision: {
    label: "En revisión",
    badge: "border-[#F0DCAE] bg-[#FDF6E7] text-[#966210]",
    hint: "Estamos verificando disponibilidad y tiempos de entrega.",
  },
  cotizada: {
    label: "Cotizada",
    badge: "border-red/25 bg-red/10 text-red",
    hint: "Ya tienes precios. Revísalos y confirma para reservar las piezas.",
  },
  confirmada: {
    label: "Confirmada",
    badge: "border-navy/20 bg-navy/10 text-navy",
    hint: "Cotización aceptada. Un asesor de CAVI te contactará para coordinar el pago y la entrega.",
  },
  entregada: {
    label: "Entregada",
    badge: "border-green/25 bg-green/10 text-green",
    hint: "Pedido entregado. Gracias por confiar en CAVI.",
  },
  cancelada: {
    label: "Cancelada",
    badge: "border-line-2 bg-transparent text-muted-2 line-through",
    hint: "Esta solicitud se canceló.",
  },
};

/** Texto del canal: "por WhatsApp", "por llamada" o "en tienda". */
export const QUOTE_CHANNEL_TEXT: Record<QuoteChannel, string> = {
  whatsapp: "por WhatsApp",
  llamada: "por llamada",
  correo: "por correo",
  tienda: "en tienda",
};

/* ------------------------------------------------------------------ *
 * Llamadas al servidor
 * ------------------------------------------------------------------ */

const OFFLINE_MESSAGE =
  "No pudimos conectarnos con CAVI. Revisa tu conexión e inténtalo de nuevo.";
const SERVER_MESSAGE =
  "No pudimos completar la solicitud. Inténtalo de nuevo en unos minutos.";

/** Error con el mensaje que se le puede mostrar al cliente tal cual. */
export class PortalError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "PortalError";
    this.status = status;
    this.code = code;
  }
}

/** Mensaje para el cliente de cualquier error, incluido uno inesperado. */
export function errorMessage(error: unknown): string {
  return error instanceof PortalError ? error.message : SERVER_MESSAGE;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readError(status: number, body: unknown): PortalError {
  const error = isRecord(body) && isRecord(body.error) ? body.error : null;
  const code = typeof error?.code === "string" ? error.code : "desconocido";
  // Una respuesta que no viene del servidor de CAVI (p. ej. el proxy sin servidor
  // detrás) no trae un error propio.
  if (!error) return new PortalError(status, "sin_conexion", status >= 500 ? OFFLINE_MESSAGE : SERVER_MESSAGE);
  if (status >= 500) return new PortalError(status, code, SERVER_MESSAGE);
  const message = typeof error.message === "string" && error.message ? error.message : SERVER_MESSAGE;
  return new PortalError(status, code, message);
}

async function request<T>(
  path: string,
  init: { method?: string; json?: unknown; form?: FormData } = {}
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;
  if (init.form) {
    body = init.form;
  } else if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }

  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? (body ? "POST" : "GET"),
      headers,
      body,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new PortalError(0, "sin_conexion", OFFLINE_MESSAGE);
  }

  // El contrato de cada ruta lo fija el servidor de CAVI; aquí solo se descarta lo que no es JSON.
  let data: T | null = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) throw readError(res.status, data);
  if (data === null) throw new PortalError(res.status, "sin_conexion", OFFLINE_MESSAGE);
  return data;
}

/* ------------------------------------------------------------------ *
 * Respuestas del servidor y su traducción
 * ------------------------------------------------------------------ */

type ApiAccount = {
  nombre: string;
  correo: string;
  telefono: string;
  empresa: string | null;
  rtn: string | null;
  correoConfirmado: boolean;
  debeCambiarClave: boolean;
  ultimaEntrega?: {
    numero: string;
    modo: "envio" | "retiro";
    sucursal: string | null;
    ultimoEnvio: {
      departamento: string | null;
      ciudad: string | null;
      direccion: string | null;
      referencia: string | null;
    } | null;
  } | null;
};

type ApiQuote = {
  numero: string;
  creadaEn: string;
  estado: QuoteStatus;
  entrega: {
    modo: "envio" | "retiro";
    departamento: string | null;
    ciudad: string | null;
    direccion: string | null;
    referencia: string | null;
    sucursal: string | null;
  };
  equipo: string | null;
  serie: string | null;
  notas: string | null;
  conFoto: boolean;
  piezas: {
    productoId: string;
    nombre: string;
    numeroParte: string;
    cantidad: number;
    precioUnitario: number | null;
  }[];
  total: number | null;
  cotizadaPor: "sistema" | QuoteChannel | null;
  motivoCancelacion: string | null;
};

const opt = (value: string | null | undefined): string | undefined => value || undefined;

function toLastDelivery(raw: ApiAccount["ultimaEntrega"]): LastDelivery | null {
  if (!raw) return null;
  const shipping = raw.ultimoEnvio;
  return {
    quoteId: raw.numero,
    mode: raw.modo,
    branch: opt(raw.sucursal),
    lastShipping:
      shipping && shipping.departamento && shipping.ciudad && shipping.direccion
        ? {
            department: shipping.departamento,
            city: shipping.ciudad,
            address: shipping.direccion,
            reference: opt(shipping.referencia),
          }
        : undefined,
  };
}

function toAccount(raw: ApiAccount): Account {
  return {
    name: raw.nombre,
    email: raw.correo,
    phone: raw.telefono,
    company: opt(raw.empresa),
    rtn: opt(raw.rtn),
    emailVerified: raw.correoConfirmado,
    mustChangePassword: raw.debeCambiarClave,
    lastDelivery: toLastDelivery(raw.ultimaEntrega),
  };
}

function toQuote(raw: ApiQuote): Quote {
  return {
    id: raw.numero,
    createdAt: Date.parse(raw.creadaEn),
    status: raw.estado,
    items: raw.piezas.map((p) => ({
      productId: p.productoId,
      name: p.nombre,
      part: p.numeroParte,
      qty: p.cantidad,
      unitPrice: p.precioUnitario ?? undefined,
    })),
    delivery: {
      mode: raw.entrega.modo,
      department: opt(raw.entrega.departamento),
      city: opt(raw.entrega.ciudad),
      address: opt(raw.entrega.direccion),
      reference: opt(raw.entrega.referencia),
      branch: opt(raw.entrega.sucursal),
    },
    equipment: opt(raw.equipo),
    serial: opt(raw.serie),
    notes: opt(raw.notas),
    hasPhoto: raw.conFoto,
    total: raw.total ?? undefined,
    quotedVia: raw.cotizadaPor && raw.cotizadaPor !== "sistema" ? raw.cotizadaPor : undefined,
    cancelReason: opt(raw.motivoCancelacion),
  };
}

/* ------------------------------------------------------------------ *
 * Sesión
 * ------------------------------------------------------------------ */

/** Evento propio para que el header y el portal reaccionen al ingreso o la salida sin recargar. */
const SESSION_EVENT = "cavi-session";
/** Al volver a la pestaña se revalida la sesión, como máximo una vez por minuto. */
const SESSION_TTL_MS = 60 * 1000;

let cachedAccount: { at: number; promise: Promise<Account | null> } | null = null;

function emitSessionChange(): void {
  cachedAccount = null;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EVENT));
}

async function fetchAccount(): Promise<Account | null> {
  try {
    return toAccount(await request<ApiAccount>("/api/me"));
  } catch (error) {
    if (error instanceof PortalError && error.status === 401) return null;
    throw error;
  }
}

/**
 * Cuenta de la sesión abierta, o null si no hay sesión. Falla (PortalError)
 * solo si no se pudo preguntar al servidor.
 */
export function getAccount(options: { fresh?: boolean } = {}): Promise<Account | null> {
  const now = Date.now();
  if (!options.fresh && cachedAccount && now - cachedAccount.at < SESSION_TTL_MS) {
    return cachedAccount.promise;
  }
  const promise = fetchAccount();
  cachedAccount = { at: now, promise };
  promise.catch(() => {
    if (cachedAccount?.promise === promise) cachedAccount = null;
  });
  return promise;
}

/** true si hay una sesión abierta; ante un error del servidor, false. */
export async function isLoggedIn(): Promise<boolean> {
  try {
    return (await getAccount()) !== null;
  } catch {
    return false;
  }
}

/**
 * Suscripción a cambios de sesión (ingreso, salida, clave nueva) y a la vuelta
 * a la pestaña, para que el header y el portal se mantengan al día.
 */
export function onSessionChange(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  const onVisible = () => {
    if (document.visibilityState === "visible") listener();
  };
  window.addEventListener(SESSION_EVENT, handler);
  window.addEventListener("focus", handler);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.removeEventListener(SESSION_EVENT, handler);
    window.removeEventListener("focus", handler);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

/** Correo inexistente y clave incorrecta devuelven lo mismo ("invalid"). */
export async function login(email: string, password: string): Promise<LoginResult> {
  try {
    const res = await request<{ ok: true; debeCambiarClave: boolean }>("/api/auth/ingresar", {
      json: { correo: email.trim(), clave: password },
    });
    emitSessionChange();
    return { ok: true, mustChangePassword: res.debeCambiarClave };
  } catch (error) {
    if (error instanceof PortalError) {
      if (error.code === "correo_sin_confirmar") return { ok: false, reason: "unverified" };
      if (error.status === 401 || error.code === "invalid_request") {
        return { ok: false, reason: "invalid" };
      }
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  try {
    await request<{ ok: true }>("/api/auth/salir", { method: "POST", json: {} });
  } finally {
    emitSessionChange();
  }
}

/* ------------------------------------------------------------------ *
 * Cuenta y acceso
 * ------------------------------------------------------------------ */

/** Datos de contacto de la cuenta; el correo no se cambia por aquí. */
export async function updateAccount(
  patch: Partial<Pick<Account, "name" | "phone" | "company" | "rtn">>
): Promise<Account> {
  const raw = await request<ApiAccount>("/api/me", {
    method: "PATCH",
    json: {
      ...(patch.name !== undefined && { nombre: patch.name.trim() }),
      ...(patch.phone !== undefined && { telefono: patch.phone.trim() }),
      ...(patch.company !== undefined && { empresa: patch.company.trim() }),
      ...(patch.rtn !== undefined && { rtn: patch.rtn.trim() }),
    },
  });
  const previous = cachedAccount ? await cachedAccount.promise.catch(() => null) : null;
  const account = { ...toAccount(raw), lastDelivery: previous?.lastDelivery ?? null };
  cachedAccount = { at: Date.now(), promise: Promise.resolve(account) };
  return account;
}

/** Canjea el enlace de confirmación. Un enlace vencido, usado o adulterado es "invalid". */
export async function confirmEmail(token: string): Promise<"confirmed" | "invalid"> {
  if (!token) return "invalid";
  try {
    await request<{ ok: true }>("/api/auth/confirmar", { json: { token } });
    return "confirmed";
  } catch (error) {
    if (error instanceof PortalError && error.status === 400) return "invalid";
    throw error;
  }
}

/** Enlace de confirmación nuevo. Responde siempre igual: no revela qué correos tienen cuenta. */
export async function resendConfirmation(email: string): Promise<void> {
  await request<{ ok: true }>("/api/auth/reenviar-confirmacion", {
    json: { correo: email.trim() },
  });
}

/** «¿Olvidaste tu clave?». Responde siempre igual: no revela qué correos tienen cuenta. */
export async function requestPasswordReset(email: string): Promise<void> {
  await request<{ ok: true }>("/api/auth/olvide-clave", { json: { correo: email.trim() } });
}

function validateNewPassword(next: string, repeat: string): string | null {
  if (next.length < MIN_PASSWORD_LENGTH) {
    return `La clave debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (next !== repeat) return "Las claves no coinciden.";
  return null;
}

async function savePassword(body: { actual?: string; nueva: string }): Promise<PasswordResult> {
  try {
    await request<{ ok: true }>("/api/me/clave", { json: body });
    emitSessionChange();
    return { ok: true };
  } catch (error) {
    if (error instanceof PortalError && error.status === 401) {
      emitSessionChange();
      return { ok: false, error: "Tu sesión terminó. Vuelve a ingresar." };
    }
    if (error instanceof PortalError && error.status < 500 && error.status !== 0) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

/** Primer ingreso (o tras «¿Olvidaste tu clave?»): reemplaza la clave temporal. */
export async function setInitialPassword(next: string, repeat: string): Promise<PasswordResult> {
  const problem = validateNewPassword(next, repeat);
  if (problem) return { ok: false, error: problem };
  return savePassword({ nueva: next });
}

/** Cambio de clave desde Mis datos. */
export async function changePassword(
  current: string,
  next: string,
  repeat: string
): Promise<PasswordResult> {
  const problem = validateNewPassword(next, repeat);
  if (problem) return { ok: false, error: problem };
  if (next === current) {
    return { ok: false, error: "La clave nueva debe ser distinta de la actual." };
  }
  return savePassword({ actual: current, nueva: next });
}

/* ------------------------------------------------------------------ *
 * Cotizaciones
 * ------------------------------------------------------------------ */

/**
 * Envía la solicitud con la foto opcional. Con sesión abierta se agrega a esa
 * cuenta; sin sesión, el servidor crea o vincula la cuenta del correo y manda
 * el correo de confirmación cuando corresponde.
 */
export async function submitQuote(
  input: QuoteRequest,
  photo: File | null
): Promise<QuoteRequestResult> {
  const delivery =
    input.delivery.mode === "envio"
      ? {
          modo: "envio",
          departamento: input.delivery.department ?? "",
          ciudad: input.delivery.city ?? "",
          direccion: input.delivery.address?.trim() ?? "",
          referencia: input.delivery.reference?.trim() || null,
        }
      : { modo: "retiro", sucursal: input.delivery.branch ?? "" };

  const form = new FormData();
  form.append(
    "datos",
    JSON.stringify({
      nombre: input.name.trim(),
      ...(input.email ? { correo: input.email.trim() } : {}),
      telefono: input.phone.trim(),
      empresa: input.company?.trim() || null,
      rtn: input.rtn?.trim() || null,
      entrega: delivery,
      equipo: input.equipment?.trim() || null,
      serie: input.serial?.trim() || null,
      notas: input.notes?.trim() || null,
      piezas: input.items.map((i) => ({
        productoId: i.productId,
        nombre: i.name,
        numeroParte: i.part,
        cantidad: i.qty,
      })),
    })
  );
  if (photo) form.append("foto", photo, photo.name);

  const res = await request<{ numero: string; correo: string; enPortal?: boolean }>(
    "/api/cotizaciones",
    { form }
  );
  // La última entrega de la cuenta cambió: hay que volver a pedirla.
  cachedAccount = null;
  return { quoteId: res.numero, email: res.correo, inPortal: res.enPortal === true };
}

/** Tope de páginas que se piden: el servidor manda 50 cotizaciones por página. */
const MAX_PAGES = 20;

/** Historial del cliente de la sesión, de la más nueva a la más antigua. */
export async function getQuotes(): Promise<Quote[]> {
  const quotes: Quote[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await request<{ cotizaciones: ApiQuote[]; total: number }>(
      `/api/cotizaciones/mias?pagina=${page}`
    );
    quotes.push(...res.cotizaciones.map(toQuote));
    if (res.cotizaciones.length === 0 || quotes.length >= res.total) break;
  }
  return quotes;
}

const quotePath = (id: string) => `/api/cotizaciones/mias/${encodeURIComponent(id)}`;

/** null si no existe o no es del cliente de la sesión. */
export async function getQuote(id: string): Promise<Quote | null> {
  if (!id) return null;
  try {
    return toQuote(await request<ApiQuote>(quotePath(id)));
  } catch (error) {
    if (error instanceof PortalError && error.status === 404) return null;
    throw error;
  }
}

/**
 * Acepta una cotización «Cotizada» con el total que el cliente tiene a la vista: pasa a
 * «Confirmada» y CAVI recibe el aviso. Si el asesor cambió los precios mientras tanto, el
 * servidor responde 409 `precio_cambio` y no la confirma (ver `pricesChanged`).
 */
export async function acceptQuote(quote: Pick<Quote, "id" | "total">): Promise<Quote> {
  const total = typeof quote.total === "number" ? quote.total.toFixed(2) : null;
  return toQuote(await request<ApiQuote>(`${quotePath(quote.id)}/aceptar`, { method: "POST", json: { total } }));
}

/** El cliente intentó aceptar un total que ya no es el de la cotización: hay que recargarla. */
export const pricesChanged = (error: unknown): boolean =>
  error instanceof PortalError && error.status === 409 && error.code === "precio_cambio";

/** «Ya no la necesito»: la cancela con el comentario opcional y CAVI recibe el aviso. */
export async function cancelQuote(id: string, comment?: string): Promise<Quote> {
  const comentario = comment?.trim();
  return toQuote(
    await request<ApiQuote>(`${quotePath(id)}/cancelar`, {
      method: "POST",
      json: comentario ? { comentario } : {},
    })
  );
}

/* ------------------------------------------------------------------ *
 * Contacto y boletín
 * ------------------------------------------------------------------ */

export async function sendContactMessage(input: ContactMessage): Promise<void> {
  await request<{ ok: true }>("/api/contacto", {
    json: {
      nombre: input.name.trim(),
      empresa: input.company?.trim() || null,
      correo: input.email.trim(),
      telefono: input.phone.trim(),
      mensaje: input.message.trim(),
    },
  });
}

export async function subscribeNewsletter(email: string): Promise<void> {
  await request<{ ok: true }>("/api/boletin", { json: { correo: email.trim() } });
}

/* ------------------------------------------------------------------ *
 * Formato
 * ------------------------------------------------------------------ */

const MONTHS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** "12 jul 2026": formato corto es-HN, sin depender de los datos regionales del navegador. */
export function formatQuoteDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

/** Monto en lempiras, p. ej. "L 12,450.00". */
export function formatLempiras(amount: number): string {
  const [int, dec] = amount.toFixed(2).split(".");
  return `L ${int.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${dec}`;
}

/** Total de unidades (suma de cantidades) de una cotización. */
export function countUnits(quote: Quote): number {
  return quote.items.reduce((sum, i) => sum + i.qty, 0);
}
