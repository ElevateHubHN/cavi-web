import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';

/** URL de la base de pruebas. Se exige que se llame `cavi_test` para que un test nunca vacíe la de desarrollo. */
export function testDatabaseUrl(): string {
  const values = parse(readFileSync(resolve('.env.test')));
  const base = values.TEST_DATABASE_URL;
  if (!base) throw new Error('Falta api/.env.test con TEST_DATABASE_URL');
  const url = new URL(base);
  if (url.pathname !== '/cavi_test') throw new Error('La base de pruebas debe llamarse cavi_test');
  return url.toString();
}
