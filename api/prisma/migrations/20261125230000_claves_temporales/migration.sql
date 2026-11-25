-- AlterEnum
ALTER TYPE "TipoTokenCliente" ADD VALUE 'clave_temporal';

-- AlterTable
ALTER TABLE "token_cliente" ADD COLUMN "claveHash" TEXT;

-- AlterTable
ALTER TABLE "correo" ADD COLUMN "contenido" TEXT;

-- AlterTable
ALTER TABLE "cliente" DROP COLUMN "claveTemporalHash",
DROP COLUMN "claveTemporalVenceEn";
