import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { MAX_CANTIDAD, MAX_PIEZAS, aceptarPorCliente, cancelarPorCliente, formatoNumero, numeroDesdeTexto } from '../../dominio/cotizaciones.js';
import { AppError, NotFoundError } from '../../shared/errors.js';
import { MAX_TEXTO_LIBRE, POR_PAGINA, correo, pagina, texto, textoOpcional } from '../../shared/validacion.js';
import type { Servicios } from '../../servicios.js';
import { anotarCorreo, candadoDeCorreo, reservarCorreoDeCuenta } from '../../correos/correos.js';
import { demasiadosIntentos, ventanaDeUsos } from '../../shared/ventana.js';
import { emitirConfirmacion, enviarConfirmacion, nuevasCredenciales, type Credenciales } from '../clientes/cuentas.js';
import { clienteOpcional, requiereCliente } from '../clientes/sesion.js';
import { borrarFoto, guardarFoto, type FotoGuardada } from './foto.js';
import { SELECT_VISTA, vistaCliente } from './vista.js';
import { SELECT_AVISO, envioCotizacionAceptada, envioCotizacionCancelada, envioSolicitudNueva, type FilaAviso } from './avisos.js';

const pieza = z.object({
  productoId: texto(64),
  nombre: texto(200),
  numeroParte: texto(100),
  cantidad: z.number().int().min(1).max(MAX_CANTIDAD),
});

const entrega = z.discriminatedUnion('modo', [
  z.object({ modo: z.literal('envio'), departamento: texto(80), ciudad: texto(120), direccion: texto(500), referencia: textoOpcional(500) }),
  z.object({ modo: z.literal('retiro'), sucursal: texto(120) }),
]);

const datosSolicitud = z.object({
  nombre: texto(120),
  correo: correo.optional(),
  telefono: texto(40),
  empresa: textoOpcional(120),
  rtn: textoOpcional(20),
  entrega,
  equipo: textoOpcional(200),
  serie: textoOpcional(100),
  notas: textoOpcional(MAX_TEXTO_LIBRE),
  piezas: z.array(pieza).min(1, 'Agrega al menos una pieza.').max(MAX_PIEZAS, `Hasta ${MAX_PIEZAS} piezas por solicitud.`),
});

const parametroNumero = z.object({ numero: z.string().max(20) });
const cuerpoCancelar = z.object({ comentario: textoOpcional(MAX_TEXTO_LIBRE) }).strict();
const MONTO_NO_VALIDO = 'Indica el total que estás aceptando.';
/** El total que vio el cliente, como número o como texto («2801», «2801.00»), llevado a centavos. */
const totalVisto = z
  .union([z.number().finite().nonnegative().max(1e15, MONTO_NO_VALIDO), z.string().trim().regex(/^\d{1,15}(\.\d{1,10})?$/, MONTO_NO_VALIDO)], {
    errorMap: () => ({ message: MONTO_NO_VALIDO }),
  })
  .transform((v) => new Prisma.Decimal(v).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP));
const cuerpoAceptar = z.object({ total: totalVisto.nullable() }).strict();

const MAX_SOLICITUDES_POR_HORA = 10;
/** Solicitudes rechazadas (datos o foto inválidos) por IP y por hora: cada una pudo subir hasta 5 MB. Un error propio (5xx) no es un rechazo. */
const MAX_RECHAZADAS_POR_HORA = 30;

type EstadoCuenta = 'creada' | 'pendiente' | 'existente';

export function leerNumero(params: unknown): number {
  const numero = numeroDesdeTexto(parametroNumero.parse(params).numero);
  if (numero === null) throw new NotFoundError('La cotización no existe.');
  return numero;
}

function leerDatos(texto: string | null) {
  if (texto === null) throw new AppError('invalid_request', 'Faltan los datos de la solicitud.', 400);
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    throw new AppError('invalid_request', 'Los datos de la solicitud no tienen un formato válido.', 400);
  }
  return datosSolicitud.parse(crudo);
}

export async function rutasCotizaciones(app: FastifyInstance, { db, correos, archivosDir, limitesPorIp }: Servicios): Promise<void> {
  // Cuenta solo las solicitudes aceptadas: una rechazada por datos inválidos libera su lugar.
  const solicitudesPorIp = ventanaDeUsos(MAX_SOLICITUDES_POR_HORA, 3_600_000);
  const rechazadasPorIp = ventanaDeUsos(MAX_RECHAZADAS_POR_HORA, 3_600_000);

  async function avisoDe(clienteId: string, numero: number): Promise<FilaAviso> {
    const c = await db.cotizacion.findFirst({ where: { numero, clienteId }, select: SELECT_AVISO });
    if (!c) throw new NotFoundError('La cotización no existe.');
    return c;
  }

  const contarRechazada = async (req: FastifyRequest, reply: FastifyReply) => {
    const rechazada = reply.statusCode >= 400 && reply.statusCode < 500 && reply.statusCode !== 429;
    if (limitesPorIp && rechazada && !rechazadasPorIp.lleno(req.ip)) rechazadasPorIp.tomar(req.ip);
  };

  app.post('/api/cotizaciones', { onResponse: contarRechazada }, async (req, reply) => {
    if (!req.isMultipart()) throw new AppError('invalid_request', 'La solicitud debe enviarse como formulario.', 415);
    if (limitesPorIp && rechazadasPorIp.lleno(req.ip)) throw demasiadosIntentos();
    const liberar = limitesPorIp ? solicitudesPorIp.tomar(req.ip) : () => undefined;
    let foto: FotoGuardada | null = null;
    let fotoAsociada = false;
    try {
      const sesion = await clienteOpcional(db, req);
      let datosTexto: string | null = null;
      for await (const parte of req.parts()) {
        if (parte.type === 'file') {
          if (parte.fieldname !== 'foto') {
            parte.file.resume();
            throw new AppError('invalid_request', 'Solo se admite la foto del vehículo.', 400);
          }
          foto = await guardarFoto(parte, archivosDir);
        } else if (parte.fieldname === 'datos' && typeof parte.value === 'string') {
          datosTexto = parte.value;
        }
      }
      const datos = leerDatos(datosTexto);
      const para = sesion?.correo ?? datos.correo;
      if (!para) throw new AppError('invalid_request', 'Escribe tu correo.', 400);
      const credenciales: Credenciales | null = sesion ? null : nuevasCredenciales();
      const fotoArchivo = foto?.archivo ?? null;

      const r = await db.$transaction(async (tx) => {
        let clienteId: string;
        let nombreCuenta: string;
        let estadoCuenta: EstadoCuenta;
        const contacto = { nombre: datos.nombre, telefono: datos.telefono, empresa: datos.empresa, rtn: datos.rtn };
        if (sesion) {
          clienteId = sesion.id;
          nombreCuenta = sesion.nombre;
          estadoCuenta = 'existente';
        } else {
          await candadoDeCorreo(tx, para);
          const existente = await tx.cliente.findUnique({ where: { correo: para }, select: { id: true, nombre: true, correoConfirmado: true } });
          if (!existente) {
            const creado = await tx.cliente.create({
              data: { correo: para, ...contacto },
              select: { id: true },
            });
            clienteId = creado.id;
            nombreCuenta = datos.nombre;
            estadoCuenta = 'creada';
          } else if (!existente.correoConfirmado) {
            // Nunca se pisan los datos de una cuenta que ya existe: el contacto queda en la cotización.
            clienteId = existente.id;
            nombreCuenta = existente.nombre;
            estadoCuenta = 'pendiente';
          } else {
            clienteId = existente.id;
            nombreCuenta = existente.nombre;
            estadoCuenta = 'existente';
          }
        }
        const cotizacion = await tx.cotizacion.create({
          data: {
            clienteId,
            ...contacto,
            modoEntrega: datos.entrega.modo,
            ...(datos.entrega.modo === 'envio'
              ? { departamento: datos.entrega.departamento, ciudad: datos.entrega.ciudad, direccion: datos.entrega.direccion, referencia: datos.entrega.referencia }
              : { sucursal: datos.entrega.sucursal }),
            equipo: datos.equipo,
            serie: datos.serie,
            notas: datos.notas,
            fotoArchivo,
            items: { create: datos.piezas.map((p, orden) => ({ ...p, orden })) },
            cambios: { create: { a: 'recibida', canal: 'sistema' } },
          },
          select: { id: true, numero: true },
        });
        const confirmacion =
          credenciales && estadoCuenta !== 'existente' ? await reservarCorreoDeCuenta(tx, { tipo: 'confirmacion', para, cotizacionId: cotizacion.id }) : null;
        if (credenciales && confirmacion?.estado === 'pendiente') await emitirConfirmacion(tx, clienteId, credenciales);
        const aviso = await anotarCorreo(tx, { tipo: 'aviso_solicitud_nueva', para: correos.avisos, cotizacionId: cotizacion.id });
        return { cotizacion, confirmacion, aviso, nombreCuenta };
      });
      fotoAsociada = true;

      const numero = formatoNumero(r.cotizacion.numero);
      if (r.confirmacion && credenciales) {
        enviarConfirmacion(correos, reply, { anotado: r.confirmacion, para, nombre: r.nombreCuenta, credenciales, numero, cotizacionId: r.cotizacion.id });
      }
      const fila = await db.cotizacion.findUniqueOrThrow({ where: { id: r.cotizacion.id }, select: SELECT_AVISO });
      correos.programar(reply, r.aviso, envioSolicitudNueva(correos, fila));

      reply.code(201);
      // Sin sesión la respuesta es la misma tenga o no cuenta el correo: no revela qué correos están registrados.
      return sesion ? { numero, correo: para, enPortal: true } : { numero, correo: para };
    } catch (e) {
      if (!fotoAsociada) {
        liberar();
        await borrarFoto(foto?.ruta);
      }
      throw e;
    }
  });

  app.get('/api/cotizaciones/mias', async (req) => {
    const cliente = await requiereCliente(db, req);
    const { pagina: p } = z.object({ pagina }).parse(req.query);
    const [filas, total] = await Promise.all([
      db.cotizacion.findMany({
        where: { clienteId: cliente.id },
        orderBy: { creadaEn: 'desc' },
        skip: (p - 1) * POR_PAGINA,
        take: POR_PAGINA,
        select: SELECT_VISTA,
      }),
      db.cotizacion.count({ where: { clienteId: cliente.id } }),
    ]);
    return { cotizaciones: filas.map(vistaCliente), pagina: p, porPagina: POR_PAGINA, total };
  });

  app.get('/api/cotizaciones/mias/:numero', async (req) => {
    const cliente = await requiereCliente(db, req);
    return vistaCliente(await avisoDe(cliente.id, leerNumero(req.params)));
  });

  app.post('/api/cotizaciones/mias/:numero/aceptar', async (req, reply) => {
    const cliente = await requiereCliente(db, req);
    const numero = leerNumero(req.params);
    const { total } = cuerpoAceptar.parse(req.body ?? {});
    const r = await aceptarPorCliente(db, { clienteId: cliente.id, numero, totalVisto: total });
    const c = await avisoDe(cliente.id, r.numero);
    await correos.enviar(reply, envioCotizacionAceptada(correos, c));
    return vistaCliente(c);
  });

  app.post('/api/cotizaciones/mias/:numero/cancelar', async (req, reply) => {
    const cliente = await requiereCliente(db, req);
    const { comentario } = cuerpoCancelar.parse(req.body ?? {});
    const r = await cancelarPorCliente(db, { clienteId: cliente.id, numero: leerNumero(req.params), comentario });
    const c = await avisoDe(cliente.id, r.numero);
    await correos.enviar(reply, envioCotizacionCancelada(correos, c, { comentario, de: r.de }));
    return vistaCliente(c);
  });
}
