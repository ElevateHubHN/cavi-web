-- Deshace «claves_temporales». Las claves temporales emitidas se pierden: quien las tenga pide otra.
ALTER TABLE "cliente" ADD COLUMN "claveTemporalHash" TEXT, ADD COLUMN "claveTemporalVenceEn" TIMESTAMP(3);
UPDATE "correo" SET "contenido" = NULL;
ALTER TABLE "correo" DROP COLUMN "contenido";
DELETE FROM "token_cliente" WHERE "tipo" = 'clave_temporal';
ALTER TABLE "token_cliente" DROP COLUMN "claveHash";
ALTER TYPE "TipoTokenCliente" RENAME TO "TipoTokenCliente_viejo";
CREATE TYPE "TipoTokenCliente" AS ENUM ('confirmar');
ALTER TABLE "token_cliente" ALTER COLUMN "tipo" TYPE "TipoTokenCliente" USING ("tipo"::text::"TipoTokenCliente");
DROP TYPE "TipoTokenCliente_viejo";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261125230000_claves_temporales';
