import type { Prisma, TipoCorreo } from '@prisma/client';
import { AppError, ConflictError } from '../../shared/errors.js';
import { CUENTAN_PARA_EL_TOPE, MOTIVO_TOPE_GLOBAL, anotarCorreo, type Anotado } from '../../correos/correos.js';

export const MAX_CORREOS_POR_HORA = 3;
export const MAX_CORREOS_POR_USUARIO_POR_HORA = 30;
const UNA_HORA_MS = 3_600_000;
const DOBLE_CLIC_MS = 30_000;

export const topeDeCorreos = () =>
  new AppError('tope_correos', `Ya se enviaron ${MAX_CORREOS_POR_HORA} correos de este tipo en la última hora. Vuelve a intentarlo más tarde.`, 429);

export const topeGlobal = () => new AppError('tope_correos', `${MOTIVO_TOPE_GLOBAL}. Vuelve a intentarlo más tarde.`, 429);

export async function candado(tx: Prisma.TransactionClient, clave: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${clave}))`;
}

/**
 * Anota un correo que el personal manda a mano (bienvenida o clave temporal nueva) con el
 * candado del destinatario tomado: como máximo 3 por hora, y un segundo pedido dentro de
 * los 30 segundos se toma como doble clic y no manda nada. Si el correo no puede salir (tope
 * global), lanza 429: la transacción que cambia la clave se deshace con él.
 */
export async function reservarCorreoDelPanel(
  tx: Prisma.TransactionClient,
  datos: { tipo: TipoCorreo; para: string },
  ahora = new Date(),
): Promise<Anotado> {
  await candado(tx, `panel-correo:${datos.tipo}:${datos.para}`);
  const recientes = await tx.correo.findMany({
    where: { para: datos.para, tipo: datos.tipo, estado: { in: [...CUENTAN_PARA_EL_TOPE] }, creadoEn: { gt: new Date(ahora.getTime() - UNA_HORA_MS) } },
    select: { creadoEn: true },
    orderBy: { creadoEn: 'desc' },
  });
  const ultimo = recientes[0];
  if (ultimo && ahora.getTime() - ultimo.creadoEn.getTime() < DOBLE_CLIC_MS) {
    throw new ConflictError('ya_enviado', 'Ese correo se acaba de enviar. Espera unos segundos antes de pedir otro.');
  }
  if (recientes.length >= MAX_CORREOS_POR_HORA) throw topeDeCorreos();
  const anotado = await anotarCorreo(tx, datos, ahora);
  if (anotado.estado !== 'pendiente') throw topeGlobal();
  return anotado;
}

/**
 * Tope de correos que dispara cada usuario del panel. Vive en memoria, como los límites
 * por IP: la API corre en una sola instancia. `consumir` toma un lugar y devuelve la función que
 * lo libera; quien llama la usa si al final no se envió nada (un 409, un tope).
 */
export function limitePorUsuario(max = MAX_CORREOS_POR_USUARIO_POR_HORA, ventanaMs = UNA_HORA_MS) {
  const usos = new Map<string, number[]>();
  return {
    consumir(usuarioId: string, ahora = Date.now()): () => void {
      const vigentes = (usos.get(usuarioId) ?? []).filter((t) => ahora - t < ventanaMs);
      if (vigentes.length >= max) {
        usos.set(usuarioId, vigentes);
        throw new AppError('tope_usuario', 'Enviaste muchos correos en la última hora. Vuelve a intentarlo más tarde.', 429);
      }
      vigentes.push(ahora);
      usos.set(usuarioId, vigentes);
      let devuelto = false;
      return () => {
        if (devuelto) return;
        devuelto = true;
        const actuales = usos.get(usuarioId);
        const i = actuales?.indexOf(ahora) ?? -1;
        if (actuales && i >= 0) actuales.splice(i, 1);
      };
    },
  };
}

export type LimitePorUsuario = ReturnType<typeof limitePorUsuario>;
