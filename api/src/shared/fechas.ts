// Honduras no cambia de horario: los días de calendario que ve el personal son en UTC-6.
const ZONA_HONDURAS = '-06:00';
const DESFASE_HONDURAS_MS = 6 * 3_600_000;

/** El instante en que empieza ese día (AAAA-MM-DD) en Honduras. */
export const inicioDelDiaEnHonduras = (dia: string): Date => new Date(`${dia}T00:00:00${ZONA_HONDURAS}`);

/** El día de calendario (AAAA-MM-DD) que era en Honduras en ese instante. */
export const diaEnHonduras = (d: Date): string => new Date(d.getTime() - DESFASE_HONDURAS_MS).toISOString().slice(0, 10);
