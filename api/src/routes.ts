import type { FastifyInstance } from 'fastify';
import type { Servicios } from './servicios.js';
import { rutasClientes } from './modulos/clientes/rutas.js';
import { rutasCotizaciones } from './modulos/cotizaciones/rutas.js';
import { rutasContacto } from './modulos/contacto/rutas.js';
import { rutasPanel } from './modulos/panel/rutas.js';

export async function registerRoutes(app: FastifyInstance, servicios: Servicios): Promise<void> {
  await rutasClientes(app, servicios);
  await rutasCotizaciones(app, servicios);
  await rutasContacto(app, servicios);
  await rutasPanel(app, servicios);
}
