import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { testDatabaseUrl } from './environment.js';

export default function setup(): void {
  try {
    execFileSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
      timeout: 90_000,
      windowsHide: true,
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    });
  } catch {
    throw new Error('No se pudo migrar cavi_test (salida omitida para no mostrar la conexión).');
  }
}
