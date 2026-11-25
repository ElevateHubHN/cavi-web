import { createHash } from 'node:crypto';

/** Sesión de clave propia: cambia cuando cambia la clave, y las sesiones abiertas con la anterior dejan de valer. */
export const versionDeClave = (claveHash: string): string => createHash('sha256').update(claveHash).digest('base64url').slice(0, 16);

const PREFIJO_TEMPORAL = 't:';

/** Sesión abierta con una clave temporal: vale mientras valga esa temporal. La de clave propia nunca lleva «:». */
export const versionTemporal = (tokenId: string): string => `${PREFIJO_TEMPORAL}${tokenId}`;

export const temporalDeVersion = (ver: string): string | null => (ver.startsWith(PREFIJO_TEMPORAL) ? ver.slice(PREFIJO_TEMPORAL.length) : null);
