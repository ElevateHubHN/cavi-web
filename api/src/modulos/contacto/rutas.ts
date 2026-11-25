import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { MAX_TEXTO_LIBRE, correo, texto, textoOpcional } from '../../shared/validacion.js';
import type { Servicios } from '../../servicios.js';
import { avisoMensajeContacto } from '../../correos/plantillas.js';

const cuerpoContacto = z.object({
  nombre: texto(120),
  empresa: textoOpcional(120),
  correo,
  telefono: texto(40),
  mensaje: texto(MAX_TEXTO_LIBRE),
});

const cuerpoBoletin = z.object({ correo });

export async function rutasContacto(app: FastifyInstance, { db, correos }: Servicios): Promise<void> {
  app.post('/api/contacto', { config: { rateLimit: { max: 5, timeWindow: '1 hour' } } }, async (req, reply) => {
    const datos = cuerpoContacto.parse(req.body);
    await db.mensajeContacto.create({ data: datos, select: { id: true } });
    await correos.enviar(reply, {
      tipo: 'aviso_mensaje_contacto',
      para: correos.avisos,
      responderA: datos.correo,
      contenido: avisoMensajeContacto(correos.ctx, datos),
    });
    reply.code(201);
    return { ok: true };
  });

  app.post('/api/boletin', { config: { rateLimit: { max: 10, timeWindow: '1 hour' } } }, async (req) => {
    const datos = cuerpoBoletin.parse(req.body);
    await db.suscriptor.createMany({ data: [{ correo: datos.correo }], skipDuplicates: true });
    return { ok: true };
  });
}
