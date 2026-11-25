import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError, ConflictError, NotFoundError, UnauthorizedError } from '../../shared/errors.js';
import { correo, texto } from '../../shared/validacion.js';
import type { Servicios } from '../../servicios.js';
import { bienvenidaUsuarioPanel } from '../../correos/plantillas.js';
import { HASH_FALSO, MIN_LARGO_CLAVE, generarClaveTemporal, hashClave } from '../clientes/cuentas.js';
import { candado, reservarCorreoDelPanel, type LimitePorUsuario } from './limites.js';
import type { Anotado, Salida } from '../../correos/correos.js';
import { SELECT_USUARIO, abrirSesionPanel, cerrarSesionPanel, requierePanel, usuarioPublico } from './sesion.js';

const LIMITE_INGRESO = { max: 10, timeWindow: '15 minutes' };

const cuerpoIngreso = z.object({ correo, clave: z.string().min(1).max(200) });
const cuerpoClave = z.object({ actual: z.string().min(1).max(200).optional(), nueva: z.string().max(200) });
const rol = z.enum(['admin', 'asesor']);
const cuerpoCrear = z.object({ nombre: texto(120), correo, rol }).strict();
const cuerpoEditar = z
  .object({ nombre: texto(120), rol, activo: z.boolean(), claveTemporalNueva: z.literal(true) })
  .partial()
  .strict();
const parametroId = z.object({ id: z.string().uuid() });

function leerId(params: unknown): string {
  const r = parametroId.safeParse(params);
  if (!r.success) throw new NotFoundError('El usuario no existe.');
  return r.data.id;
}

export async function rutasUsuariosPanel(app: FastifyInstance, { db, correos }: Servicios, limite: LimitePorUsuario): Promise<void> {
  app.post('/api/panel/ingresar', { config: { rateLimit: LIMITE_INGRESO } }, async (req, reply) => {
    const datos = cuerpoIngreso.parse(req.body);
    const usuario = await db.usuario.findUnique({ where: { correo: datos.correo }, select: { ...SELECT_USUARIO, claveHash: true } });
    // Mismo mensaje y mismo trabajo exista o no el correo, y esté o no desactivado.
    const valida = await bcrypt.compare(datos.clave, usuario?.claveHash ?? HASH_FALSO);
    if (!usuario || !valida || !usuario.activo) throw new UnauthorizedError('Correo o clave incorrectos.');
    await abrirSesionPanel(reply, usuario);
    return { usuario: usuarioPublico(usuario) };
  });

  app.post('/api/panel/salir', async (_req, reply) => {
    cerrarSesionPanel(reply);
    return { ok: true };
  });

  app.get('/api/panel/me', async (req) => usuarioPublico(await requierePanel(db, req, { permitirClaveTemporal: true })));

  app.post('/api/panel/me/clave', async (req, reply) => {
    const usuario = await requierePanel(db, req, { permitirClaveTemporal: true });
    const datos = cuerpoClave.parse(req.body);
    if (datos.nueva.length < MIN_LARGO_CLAVE) {
      throw new AppError('clave_corta', `La clave debe tener al menos ${MIN_LARGO_CLAVE} caracteres.`, 400);
    }
    if (usuario.debeCambiarClave) {
      if (await bcrypt.compare(datos.nueva, usuario.claveHash)) {
        throw new AppError('clave_repetida', 'La clave nueva no puede ser igual a la clave temporal.', 400);
      }
    } else {
      if (!datos.actual || !(await bcrypt.compare(datos.actual, usuario.claveHash))) {
        throw new AppError('clave_actual_incorrecta', 'La clave actual no es correcta.', 400);
      }
      if (datos.actual === datos.nueva) throw new AppError('clave_repetida', 'La clave nueva debe ser distinta de la actual.', 400);
    }
    const claveHash = await hashClave(datos.nueva);
    await db.usuario.update({ where: { id: usuario.id }, data: { claveHash, debeCambiarClave: false } });
    await abrirSesionPanel(reply, { id: usuario.id, claveHash });
    return { ok: true };
  });

  function enviarBienvenida(
    salida: Salida,
    anotado: Anotado,
    u: { nombre: string; correo: string; rol: 'admin' | 'asesor' },
    claveTemporal: string,
    invitadoPor: string,
  ) {
    return correos.programar(salida, anotado, {
      tipo: 'bienvenida_usuario_panel',
      para: u.correo,
      contenido: bienvenidaUsuarioPanel(correos.ctx, { ...u, claveTemporal, invitadoPor }),
    });
  }

  app.get('/api/panel/usuarios', async (req) => {
    await requierePanel(db, req, { soloAdmin: true });
    const filas = await db.usuario.findMany({ orderBy: [{ activo: 'desc' }, { nombre: 'asc' }], take: 200, select: SELECT_USUARIO });
    return { filas: filas.map(usuarioPublico) };
  });

  app.post('/api/panel/usuarios', async (req, reply) => {
    const admin = await requierePanel(db, req, { soloAdmin: true });
    const datos = cuerpoCrear.parse(req.body);
    const enUso = () => new ConflictError('correo_en_uso', 'Ya hay un usuario del panel con ese correo.');
    if (await db.usuario.findUnique({ where: { correo: datos.correo }, select: { id: true } })) throw enUso();
    const claveTemporal = generarClaveTemporal();
    const claveHash = await hashClave(claveTemporal);
    const devolverCupo = limite.consumir(admin.id);
    const { creado, anotado } = await db.$transaction(async (tx) => {
      await candado(tx, `panel-usuario-nuevo:${datos.correo}`);
      if (await tx.usuario.findUnique({ where: { correo: datos.correo }, select: { id: true } })) throw enUso();
      const anotado = await reservarCorreoDelPanel(tx, { tipo: 'bienvenida_usuario_panel', para: datos.correo });
      const creado = await tx.usuario.create({ data: { ...datos, claveHash, debeCambiarClave: true }, select: SELECT_USUARIO });
      return { creado, anotado };
    }).catch((e: unknown) => {
      devolverCupo();
      throw e;
    });
    const bienvenida = enviarBienvenida(reply, anotado, creado, claveTemporal, admin.nombre);
    reply.code(201);
    return { ...usuarioPublico(creado), bienvenida };
  });

  app.patch('/api/panel/usuarios/:id', async (req, reply) => {
    const admin = await requierePanel(db, req, { soloAdmin: true });
    const id = leerId(req.params);
    const datos = cuerpoEditar.parse(req.body);
    // Un administrador no se quita a sí mismo el acceso, y el panel nunca queda sin un administrador activo.
    if (id === admin.id && (datos.activo === false || datos.rol === 'asesor')) {
      throw new ConflictError('no_sobre_si_mismo', 'No puedes desactivarte ni quitarte el rol de administrador.');
    }
    const claveTemporal = datos.claveTemporalNueva ? generarClaveTemporal() : null;
    const claveHash = claveTemporal ? await hashClave(claveTemporal) : null;
    const devolverCupo = claveTemporal ? limite.consumir(admin.id) : () => undefined;
    const { actualizado, anotado } = await db.$transaction(async (tx) => {
      await candado(tx, 'panel-administradores');
      const actual = await tx.usuario.findUnique({ where: { id }, select: { correo: true } });
      if (!actual) throw new NotFoundError('El usuario no existe.');
      const anotado = claveHash ? await reservarCorreoDelPanel(tx, { tipo: 'bienvenida_usuario_panel', para: actual.correo }) : null;
      const actualizado = await tx.usuario.update({
        where: { id },
        data: {
          ...(datos.nombre !== undefined ? { nombre: datos.nombre } : {}),
          ...(datos.rol !== undefined ? { rol: datos.rol } : {}),
          ...(datos.activo !== undefined ? { activo: datos.activo } : {}),
          ...(claveHash ? { claveHash, debeCambiarClave: true } : {}),
        },
        select: SELECT_USUARIO,
      });
      if ((await tx.usuario.count({ where: { rol: 'admin', activo: true } })) === 0) {
        throw new ConflictError('sin_administrador', 'El panel necesita al menos un administrador activo.');
      }
      return { actualizado, anotado };
    }).catch((e: unknown) => {
      devolverCupo();
      throw e;
    });
    const bienvenida = anotado && claveTemporal ? enviarBienvenida(reply, anotado, actualizado, claveTemporal, admin.nombre) : undefined;
    return { ...usuarioPublico(actualizado), ...(bienvenida ? { bienvenida } : {}) };
  });
}
