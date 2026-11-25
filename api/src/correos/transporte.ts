import nodemailer from 'nodemailer';
import type { Env } from '../config/env.js';

export interface MensajeCorreo {
  para: string;
  asunto: string;
  html: string;
  texto: string;
  responderA?: string;
  /** Nombre visible del remitente; la dirección es siempre la de CORREO_REMITENTE. */
  nombreRemitente?: string;
}

export interface Transporte {
  enviar(mensaje: MensajeCorreo): Promise<void>;
}

/** En desarrollo apunta a Mailpit (127.0.0.1:1025, sin usuario ni TLS); en producción, al buzón del dominio. */
export function transporteSmtp(env: Pick<Env, 'SMTP_HOST' | 'SMTP_PORT' | 'SMTP_SECURE' | 'SMTP_USER' | 'SMTP_PASSWORD' | 'CORREO_REMITENTE'>): Transporte {
  const smtp = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD ?? '' } } : {}),
    // Tiempos cortos: un SMTP que no responde deja el correo «fallido» en segundos y no acumula conexiones abiertas.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
    dnsTimeout: 10_000,
  });
  const direccion = /<([^>]+)>/.exec(env.CORREO_REMITENTE)?.[1] ?? env.CORREO_REMITENTE;
  return {
    async enviar(m) {
      const from = m.nombreRemitente ? { name: m.nombreRemitente, address: direccion } : env.CORREO_REMITENTE;
      await smtp.sendMail({ from, to: m.para, replyTo: m.responderA, subject: m.asunto, html: m.html, text: m.texto });
    },
  };
}

export interface TransporteMemoria extends Transporte {
  readonly mensajes: MensajeCorreo[];
  vaciar(): void;
}

/** Guarda los correos en memoria, sin red: lo usan las pruebas para mirar destinatario, asunto y contenido. */
export function transporteMemoria(): TransporteMemoria {
  const mensajes: MensajeCorreo[] = [];
  return {
    mensajes,
    async enviar(m) {
      mensajes.push({ ...m });
    },
    vaciar() {
      mensajes.length = 0;
    },
  };
}
