-- Deshace «correo_pendiente». Los correos que quedaron pendientes pasan a fallido para poder quitar el valor.
DROP INDEX IF EXISTS "correo_estado_creadoEn_idx";
UPDATE "correo" SET "estado" = 'fallido', "error" = COALESCE("error", 'No se llegó a enviar') WHERE "estado" = 'pendiente';
ALTER TYPE "EstadoCorreo" RENAME TO "EstadoCorreo_viejo";
CREATE TYPE "EstadoCorreo" AS ENUM ('enviado', 'fallido', 'omitido');
ALTER TABLE "correo" ALTER COLUMN "estado" TYPE "EstadoCorreo" USING ("estado"::text::"EstadoCorreo");
DROP TYPE "EstadoCorreo_viejo";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261125220000_correo_pendiente';
