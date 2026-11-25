import { AppError } from './errors.js';

const MAX_CLAVES_ANTES_DE_PURGAR = 10_000;

export const demasiadosIntentos = () => new AppError('rate_limited', 'Demasiados intentos. Espera un momento y vuelve a intentarlo.', 429);

/**
 * Límite en memoria por clave (la API corre en una sola instancia) que cuenta solo lo que
 * terminó bien: `tomar` reserva un lugar y quien llama lo `libera` si el pedido no se aceptó.
 * Lo reservado y todavía en curso también cuenta, así varios pedidos simultáneos no superan el tope.
 */
export function ventanaDeUsos(max: number, ventanaMs: number) {
  const usos = new Map<string, number[]>();

  function purgar(ahora: number): void {
    for (const [clave, marcas] of usos) {
      const vigentes = marcas.filter((t) => ahora - t < ventanaMs);
      if (vigentes.length === 0) usos.delete(clave);
      else usos.set(clave, vigentes);
    }
  }

  const vigentesDe = (clave: string, ahora: number) => (usos.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);

  return {
    /** Si la clave ya llegó al tope, sin reservar nada. */
    lleno(clave: string, ahora = Date.now()): boolean {
      return vigentesDe(clave, ahora).length >= max;
    },
    /** Lanza 429 si la clave ya llegó al tope; si no, devuelve la función que deshace la reserva. */
    tomar(clave: string, ahora = Date.now()): () => void {
      if (usos.size > MAX_CLAVES_ANTES_DE_PURGAR) purgar(ahora);
      const vigentes = vigentesDe(clave, ahora);
      if (vigentes.length >= max) {
        usos.set(clave, vigentes);
        throw demasiadosIntentos();
      }
      vigentes.push(ahora);
      usos.set(clave, vigentes);
      let liberada = false;
      return () => {
        if (liberada) return;
        liberada = true;
        const actuales = usos.get(clave);
        const i = actuales?.indexOf(ahora) ?? -1;
        if (actuales && i >= 0) actuales.splice(i, 1);
      };
    },
  };
}
