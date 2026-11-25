import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// true si el archivo se ejecuta directamente (node dist/server.js, tsx, PM2) y no cuando lo importa
// un test. Bajo PM2, argv[1] de un script ESM es el contenedor de PM2 (ProcessContainerFork.js):
// la ruta real está en pm_exec_path.
export const isMain = (url: string) =>
  [process.argv[1], process.env.pm_exec_path].some((p) => p !== undefined && p !== '' && pathToFileURL(resolve(p)).href === url);
