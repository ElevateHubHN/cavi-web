-- Deshace la migración inicial. Solo en local: borra todas las tablas y sus datos.
DROP TABLE IF EXISTS "correo", "suscriptor", "mensaje_contacto", "cambio_estado", "cotizacion_item", "cotizacion", "token_cliente", "cliente", "usuario" CASCADE;
DROP TYPE IF EXISTS "EstadoCotizacion", "ModoEntrega", "Canal", "TipoTokenCliente", "RolUsuario", "TipoCorreo", "EstadoCorreo";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261125181920_inicial';
