import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'clave',
      '*.clave',
      'nueva',
      '*.nueva',
      'actual',
      '*.actual',
      'token',
      '*.token',
    ],
    censor: '[oculto]',
  },
  ...(env.LOG_PRETTY ? { transport: { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss' } } } : {}),
});
