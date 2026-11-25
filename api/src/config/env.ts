import 'dotenv/config';
import { z } from 'zod';

const booleano = (porDefecto: 'true' | 'false') =>
  z.enum(['true', 'false']).default(porDefecto).transform((v) => v === 'true');

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().default('127.0.0.1'),
    PORT: z.coerce.number().int().positive().default(3250),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
    SITIO_URL: z.string().url().transform((v) => v.replace(/\/+$/, '')),
    COOKIE_SECURE: booleano('true'),
    TRUST_PROXY: booleano('false'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    LOG_PRETTY: booleano('false'),
    BCRYPT_COSTO: z.coerce.number().int().min(4).max(15).default(12),
    CORREO_REMITENTE: z.string().min(3),
    CORREO_AVISOS_CAVI: z.string().email(),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().positive(),
    SMTP_SECURE: booleano('false'),
    SMTP_USER: z.string().optional().transform((v) => v || undefined),
    SMTP_PASSWORD: z.string().optional().transform((v) => v || undefined),
    CORREO_TOPE_HORA: z.coerce.number().int().positive().default(200),
    ARCHIVOS_DIR: z.string().min(1).default('archivos'),
    FOTOS_RETENCION_DIAS: z.coerce.number().int().positive().default(180),
  });

export type Env = z.infer<typeof schema>;

function loadEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const vars = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Configuración inválida en .env: ${vars}`);
  }
  return parsed.data;
}

export const env = loadEnv();
