-- Deshace «ciclo_credenciales_y_correos». Las cuentas sin clave propia quedan con una clave que nadie puede usar
-- y deben pedir una temporal. Los correos reemplazados vuelven a fallido.
ALTER TABLE "cliente" ADD COLUMN "debeCambiarClave" BOOLEAN NOT NULL DEFAULT true;
UPDATE "cliente" SET "debeCambiarClave" = ("claveHash" IS NULL);
UPDATE "cliente" SET "claveHash" = '!' WHERE "claveHash" IS NULL;
ALTER TABLE "cliente" ALTER COLUMN "claveHash" SET NOT NULL;
ALTER TABLE "correo" DROP COLUMN "tomadoEn";
UPDATE "correo" SET "estado" = 'fallido', "error" = COALESCE("error", 'Se reenvió después') WHERE "estado" = 'reemplazado';
ALTER TYPE "EstadoCorreo" RENAME TO "EstadoCorreo_viejo";
CREATE TYPE "EstadoCorreo" AS ENUM ('enviado', 'fallido', 'omitido', 'pendiente');
ALTER TABLE "correo" ALTER COLUMN "estado" TYPE "EstadoCorreo" USING ("estado"::text::"EstadoCorreo");
DROP TYPE "EstadoCorreo_viejo";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261125235000_ciclo_credenciales_y_correos';
