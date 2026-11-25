// Una celda que empieza con = + - @, tabulador o retorno la ejecuta Excel como fórmula: se le antepone un apóstrofo.
const INICIO_DE_FORMULA = /^[=+\-@\t\r]/;

export function celdaCsv(valor: string): string {
  const seguro = INICIO_DE_FORMULA.test(valor) ? `'${valor}` : valor;
  return `"${seguro.replace(/"/g, '""')}"`;
}

export const filaCsv = (celdas: readonly string[]): string => `${celdas.map(celdaCsv).join(',')}\r\n`;
