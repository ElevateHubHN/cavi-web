import type { FastifyInstance } from 'fastify';
import type { Servicios } from '../../servicios.js';
import { rutasCotizacionesPanel } from './cotizaciones.js';
import { limitePorUsuario } from './limites.js';
import { rutasOtrasPanel } from './otros.js';
import { rutasUsuariosPanel } from './usuarios.js';

export async function rutasPanel(app: FastifyInstance, servicios: Servicios): Promise<void> {
  const limite = limitePorUsuario();
  await rutasUsuariosPanel(app, servicios, limite);
  await rutasCotizacionesPanel(app, servicios, limite);
  await rutasOtrasPanel(app, servicios);
}
