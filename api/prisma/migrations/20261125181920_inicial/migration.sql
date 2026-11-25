-- CreateEnum
CREATE TYPE "EstadoCotizacion" AS ENUM ('recibida', 'en_revision', 'cotizada', 'confirmada', 'entregada', 'cancelada');

-- CreateEnum
CREATE TYPE "ModoEntrega" AS ENUM ('envio', 'retiro');

-- CreateEnum
CREATE TYPE "Canal" AS ENUM ('sistema', 'whatsapp', 'llamada', 'correo', 'tienda');

-- CreateEnum
CREATE TYPE "TipoTokenCliente" AS ENUM ('confirmar');

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('admin', 'asesor');

-- CreateEnum
CREATE TYPE "TipoCorreo" AS ENUM ('confirmacion', 'clave_temporal', 'cotizacion_lista', 'aviso_solicitud_nueva', 'aviso_cotizacion_aceptada', 'aviso_cotizacion_cancelada', 'aviso_mensaje_contacto', 'bienvenida_usuario_panel');

-- CreateEnum
CREATE TYPE "EstadoCorreo" AS ENUM ('enviado', 'fallido', 'omitido');

-- CreateTable
CREATE TABLE "cliente" (
    "id" UUID NOT NULL,
    "correo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "empresa" TEXT,
    "rtn" TEXT,
    "correoConfirmado" BOOLEAN NOT NULL DEFAULT false,
    "claveHash" TEXT NOT NULL,
    "debeCambiarClave" BOOLEAN NOT NULL DEFAULT true,
    "claveTemporalHash" TEXT,
    "claveTemporalVenceEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_cliente" (
    "id" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "tipo" "TipoTokenCliente" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "venceEn" TIMESTAMP(3) NOT NULL,
    "usadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizacion" (
    "id" UUID NOT NULL,
    "numero" SERIAL NOT NULL,
    "clienteId" UUID NOT NULL,
    "estado" "EstadoCotizacion" NOT NULL DEFAULT 'recibida',
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "empresa" TEXT,
    "rtn" TEXT,
    "modoEntrega" "ModoEntrega" NOT NULL,
    "departamento" TEXT,
    "ciudad" TEXT,
    "direccion" TEXT,
    "referencia" TEXT,
    "sucursal" TEXT,
    "equipo" TEXT,
    "serie" TEXT,
    "notas" TEXT,
    "fotoArchivo" TEXT,
    "asesorId" UUID,
    "cotizadaPor" "Canal",
    "motivoCancelacion" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cotizadaEn" TIMESTAMP(3),
    "confirmadaEn" TIMESTAMP(3),
    "entregadaEn" TIMESTAMP(3),
    "canceladaEn" TIMESTAMP(3),

    CONSTRAINT "cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizacion_item" (
    "id" UUID NOT NULL,
    "cotizacionId" UUID NOT NULL,
    "orden" INTEGER NOT NULL,
    "productoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "numeroParte" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(12,2),

    CONSTRAINT "cotizacion_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cambio_estado" (
    "id" UUID NOT NULL,
    "cotizacionId" UUID NOT NULL,
    "de" "EstadoCotizacion",
    "a" "EstadoCotizacion" NOT NULL,
    "usuarioId" UUID,
    "canal" "Canal" NOT NULL,
    "nota" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cambio_estado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "claveHash" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'asesor',
    "debeCambiarClave" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensaje_contacto" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "empresa" TEXT,
    "correo" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "atendidoEn" TIMESTAMP(3),
    "atendidoPorId" UUID,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensaje_contacto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suscriptor" (
    "id" UUID NOT NULL,
    "correo" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suscriptor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correo" (
    "id" UUID NOT NULL,
    "tipo" "TipoCorreo" NOT NULL,
    "para" TEXT NOT NULL,
    "cotizacionId" UUID,
    "estado" "EstadoCorreo" NOT NULL,
    "error" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "correo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cliente_correo_key" ON "cliente"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "token_cliente_tokenHash_key" ON "token_cliente"("tokenHash");

-- CreateIndex
CREATE INDEX "token_cliente_clienteId_tipo_idx" ON "token_cliente"("clienteId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "cotizacion_numero_key" ON "cotizacion"("numero");

-- CreateIndex
CREATE INDEX "cotizacion_clienteId_creadaEn_idx" ON "cotizacion"("clienteId", "creadaEn");

-- CreateIndex
CREATE INDEX "cotizacion_estado_creadaEn_idx" ON "cotizacion"("estado", "creadaEn");

-- CreateIndex
CREATE INDEX "cotizacion_sucursal_idx" ON "cotizacion"("sucursal");

-- CreateIndex
CREATE INDEX "cotizacion_item_cotizacionId_orden_idx" ON "cotizacion_item"("cotizacionId", "orden");

-- CreateIndex
CREATE INDEX "cambio_estado_cotizacionId_creadoEn_idx" ON "cambio_estado"("cotizacionId", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_correo_key" ON "usuario"("correo");

-- CreateIndex
CREATE INDEX "mensaje_contacto_atendidoEn_creadoEn_idx" ON "mensaje_contacto"("atendidoEn", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "suscriptor_correo_key" ON "suscriptor"("correo");

-- CreateIndex
CREATE INDEX "correo_para_tipo_creadoEn_idx" ON "correo"("para", "tipo", "creadoEn");

-- CreateIndex
CREATE INDEX "correo_cotizacionId_creadoEn_idx" ON "correo"("cotizacionId", "creadoEn");

-- AddForeignKey
ALTER TABLE "token_cliente" ADD CONSTRAINT "token_cliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion" ADD CONSTRAINT "cotizacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion" ADD CONSTRAINT "cotizacion_asesorId_fkey" FOREIGN KEY ("asesorId") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_item" ADD CONSTRAINT "cotizacion_item_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cambio_estado" ADD CONSTRAINT "cambio_estado_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cambio_estado" ADD CONSTRAINT "cambio_estado_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensaje_contacto" ADD CONSTRAINT "mensaje_contacto_atendidoPorId_fkey" FOREIGN KEY ("atendidoPorId") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correo" ADD CONSTRAINT "correo_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- El primer número de cotización visible es CT-1042; START también fija a dónde vuelve un TRUNCATE ... RESTART IDENTITY.
ALTER SEQUENCE "cotizacion_numero_seq" START WITH 1042 RESTART WITH 1042;
