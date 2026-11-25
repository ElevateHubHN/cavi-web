-- AlterEnum
ALTER TYPE "EstadoCorreo" ADD VALUE 'pendiente';

-- CreateIndex
CREATE INDEX "correo_estado_creadoEn_idx" ON "correo"("estado", "creadoEn");
