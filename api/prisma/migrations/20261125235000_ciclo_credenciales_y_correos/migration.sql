-- AlterEnum
ALTER TYPE "EstadoCorreo" ADD VALUE 'reemplazado';

-- AlterTable
ALTER TABLE "correo" ADD COLUMN "tomadoEn" TIMESTAMP(3);

-- La clave de una cuenta que todavía debía cambiarla era una temporal: deja de servir y se pide otra.
ALTER TABLE "cliente" ALTER COLUMN "claveHash" DROP NOT NULL;
UPDATE "cliente" SET "claveHash" = NULL WHERE "debeCambiarClave";
ALTER TABLE "cliente" DROP COLUMN "debeCambiarClave";
