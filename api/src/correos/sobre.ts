import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

// El mensaje de un correo pendiente lleva enlaces y claves temporales: en la base va cifrado.
const LLAVE = createHmac('sha256', env.JWT_SECRET).update('correo-pendiente').digest();

export function cifrar(datos: unknown): string {
  const iv = randomBytes(12);
  const cifrador = createCipheriv('aes-256-gcm', LLAVE, iv);
  const cuerpo = Buffer.concat([cifrador.update(JSON.stringify(datos), 'utf8'), cifrador.final()]);
  return [iv, cifrador.getAuthTag(), cuerpo].map((b) => b.toString('base64url')).join('.');
}

/** Null si no se puede abrir (otra llave, texto dañado). */
export function descifrar(sobre: string): unknown {
  try {
    const [iv, etiqueta, cuerpo] = sobre.split('.').map((p) => Buffer.from(p, 'base64url'));
    if (!iv || !etiqueta || !cuerpo) return null;
    const descifrador = createDecipheriv('aes-256-gcm', LLAVE, iv);
    descifrador.setAuthTag(etiqueta);
    return JSON.parse(Buffer.concat([descifrador.update(cuerpo), descifrador.final()]).toString('utf8'));
  } catch {
    return null;
  }
}
