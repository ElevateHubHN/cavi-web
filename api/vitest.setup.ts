import { testDatabaseUrl } from './src/testing/environment.js';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDatabaseUrl();
process.env.JWT_SECRET = 'solo-para-tests-0123456789abcdefghijklmn';
process.env.SITIO_URL = 'https://cavi.example';
process.env.COOKIE_SECURE = 'false';
process.env.LOG_LEVEL = 'fatal';
process.env.LOG_PRETTY = 'false';
process.env.TRUST_PROXY = 'false';
process.env.ARCHIVOS_DIR = 'tmp/archivos-test';
process.env.CORREO_AVISOS_CAVI = 'avisos@cavi.example';
process.env.SMTP_HOST = '127.0.0.1';
process.env.SMTP_PORT = '9';
process.env.CORREO_REMITENTE = 'Repuestos CAVI <no-responder@cavi.example>';
process.env.BCRYPT_COSTO = '4';
