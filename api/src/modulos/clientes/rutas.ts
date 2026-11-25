import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { formatoNumero } from '../../dominio/cotizaciones.js';
import { correo, texto, textoOpcional } from '../../shared/validacion.js';
import type { Servicios } from '../../servicios.js';
import { ventanaDeUsos } from '../../shared/ventana.js';
import { cambiarClave, confirmarCorreo, ingresar, olvideClave, reenviarConfirmacion } from './cuentas.js';
import { abrirSesionCliente, cerrarSesionCliente, requiereCliente, type ClienteDeSesion } from './sesion.js';

const LIMITE_INGRESO = { max: 10, timeWindow: '15 minutes' };
/** Pedidos que mandan un correo de cuenta: «¿Olvidaste tu clave?» y «reenviar confirmación» suman juntos. */
const MAX_CORREOS_DE_CUENTA_POR_IP_POR_HORA = 10;

const cuerpoCorreo = z.object({ correo });
const cuerpoIngreso = z.object({ correo, clave: z.string().min(1).max(200) });
const cuerpoConfirmar = z.object({ token: z.string().min(1).max(200) });
const cuerpoClave = z.object({ actual: z.string().min(1).max(200).optional(), nueva: z.string().max(200) });
const cuerpoDatos = z
  .object({
    nombre: texto(120),
    telefono: texto(40),
    empresa: textoOpcional(120),
    rtn: textoOpcional(20),
  })
  .partial()
  .strict();

async function ultimaEntrega(db: PrismaClient, clienteId: string) {
  const ultima = await db.cotizacion.findFirst({
    where: { clienteId },
    orderBy: { creadaEn: 'desc' },
    select: { numero: true, modoEntrega: true, sucursal: true },
  });
  if (!ultima) return null;
  const envio = await db.cotizacion.findFirst({
    where: { clienteId, modoEntrega: 'envio' },
    orderBy: { creadaEn: 'desc' },
    select: { departamento: true, ciudad: true, direccion: true, referencia: true },
  });
  return {
    numero: formatoNumero(ultima.numero),
    modo: ultima.modoEntrega,
    sucursal: ultima.modoEntrega === 'retiro' ? ultima.sucursal : null,
    ultimoEnvio: envio,
  };
}

const cuenta = (c: Pick<ClienteDeSesion, 'nombre' | 'correo' | 'telefono' | 'empresa' | 'rtn' | 'debeCambiarClave'>) => ({
  nombre: c.nombre,
  correo: c.correo,
  telefono: c.telefono,
  empresa: c.empresa,
  rtn: c.rtn,
  correoConfirmado: true,
  debeCambiarClave: c.debeCambiarClave,
});

export async function rutasClientes(app: FastifyInstance, { db, correos, limitesPorIp }: Servicios): Promise<void> {
  const correosDeCuentaPorIp = ventanaDeUsos(MAX_CORREOS_DE_CUENTA_POR_IP_POR_HORA, 3_600_000);
  const limitarCorreoDeCuenta = (ip: string) => {
    if (limitesPorIp) correosDeCuentaPorIp.tomar(ip);
  };

  app.post('/api/auth/confirmar', async (req) => {
    const { token } = cuerpoConfirmar.parse(req.body);
    await confirmarCorreo(db, token);
    return { ok: true };
  });

  app.post('/api/auth/reenviar-confirmacion', async (req, reply) => {
    limitarCorreoDeCuenta(req.ip);
    const datos = cuerpoCorreo.parse(req.body);
    await reenviarConfirmacion(db, correos, reply, datos.correo);
    return { ok: true };
  });

  app.post('/api/auth/olvide-clave', async (req, reply) => {
    limitarCorreoDeCuenta(req.ip);
    const datos = cuerpoCorreo.parse(req.body);
    await olvideClave(db, correos, reply, datos.correo);
    return { ok: true };
  });

  app.post('/api/auth/ingresar', { config: { rateLimit: LIMITE_INGRESO } }, async (req, reply) => {
    const datos = cuerpoIngreso.parse(req.body);
    const cliente = await ingresar(db, datos.correo, datos.clave);
    await abrirSesionCliente(reply, cliente);
    return { ok: true, debeCambiarClave: cliente.debeCambiarClave };
  });

  app.post('/api/auth/salir', async (_req, reply) => {
    cerrarSesionCliente(reply);
    return { ok: true };
  });

  app.get('/api/me', async (req) => {
    const cliente = await requiereCliente(db, req, { permitirClaveTemporal: true });
    return { ...cuenta(cliente), ultimaEntrega: await ultimaEntrega(db, cliente.id) };
  });

  app.patch('/api/me', async (req) => {
    const cliente = await requiereCliente(db, req);
    const datos = cuerpoDatos.parse(req.body);
    const actualizado = await db.cliente.update({
      where: { id: cliente.id },
      data: datos,
      select: { nombre: true, correo: true, telefono: true, empresa: true, rtn: true },
    });
    return cuenta({ ...actualizado, debeCambiarClave: false });
  });

  app.post('/api/me/clave', async (req, reply) => {
    const cliente = await requiereCliente(db, req, { permitirClaveTemporal: true });
    const datos = cuerpoClave.parse(req.body);
    const nueva = await cambiarClave(db, cliente, datos);
    await abrirSesionCliente(reply, nueva);
    return { ok: true };
  });
}
