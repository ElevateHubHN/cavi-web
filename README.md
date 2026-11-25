# Repuestos CAVI: sitio, cotizaciones y panel

Sitio web de Repuestos CAVI con catálogo, solicitud de cotización y portal de clientes, más
el panel donde los asesores ponen precios y dan seguimiento a cada solicitud.

## Cómo funciona

1. El cliente arma su pedido en el catálogo y envía la solicitud, con foto del vehículo si
   quiere. Recibe por correo un enlace para confirmar su cuenta y una clave temporal.
2. CAVI recibe un aviso por correo y la solicitud aparece en el panel.
3. Un asesor la toma y pone los precios. Puede enviarla desde el sistema, y el cliente
   la ve con el total en su portal y por correo, o marcar que la envió por WhatsApp u
   otro medio.
4. El cliente la acepta o la cancela desde su portal, y CAVI recibe el aviso.
5. El asesor puede mover el estado cuando algo se resolvió fuera del sistema. Cada cambio
   queda en la bitácora de la cotización.

Estados de una cotización: recibida → en revisión → cotizada → confirmada → entregada, más
cancelada.

## Partes del proyecto

| Carpeta | Qué es | Tecnología |
|---|---|---|
| `web/` | Sitio público y portal de clientes | Next.js, exportado como archivos estáticos |
| `api/` | Cotizaciones, cuentas, correos, contacto y boletín | Node.js 22, Fastify, Prisma y PostgreSQL |
| `panel/` | Panel de CAVI, en `/panel/` | React y Vite |
| `nginx/` | Ejemplo de configuración del servidor web | nginx |

En el servidor, nginx sirve el sitio y el panel como archivos y pasa todo lo que empieza
con `/api/` a la API, que corre como un único proceso de Node.js.

Los productos del catálogo están en el código (`web/lib/products.ts`), no en la base de
datos: para agregar o cambiar uno se edita ese archivo y se vuelve a desplegar.

## Usuarios del panel

- **Administrador:** todo lo del asesor, más crear usuarios del panel, darles una clave
  temporal y descargar la lista del boletín.
- **Asesor:** ve y atiende todas las cotizaciones, clientes y mensajes de contacto.

El primer administrador se crea en el servidor (ver `docs/despliegue.md`). Los demás los
crea un administrador desde Ajustes, y cada uno recibe su clave temporal por correo.

## Correos

Todos los correos salen del buzón configurado en `api/.env`, y cada uno queda registrado en
la base de datos con su estado. Si uno no sale, por ejemplo porque el servidor de correo
está caído, la cotización se guarda igual y el panel ofrece reenviarlo desde su detalle.

Para evitar bloqueos del proveedor hay un tope de correos por hora (`CORREO_TOPE_HORA`) y
otro de 3 correos de cuenta por hora a una misma dirección.

## Trabajar en una computadora

Requisitos: Node.js 22 y PostgreSQL. Para ver los correos sin enviarlos de verdad se usa
[Mailpit](https://mailpit.axllent.org/), que los recibe en `127.0.0.1:1025` y los muestra
en `http://127.0.0.1:8025`.

```bash
# API
cd api
cp .env.example .env        # completar DATABASE_URL y JWT_SECRET
npm install
npx prisma migrate dev      # crea las tablas
npm run dev                 # http://127.0.0.1:3250

# Sitio (en otra terminal): pasa /api a la API
cd web && npm install && npm run dev -- -p 3251   # http://localhost:3251

# Panel (en otra terminal)
cd panel && npm install && npm run dev            # http://localhost:3252/panel/
```

Para entrar al panel hace falta un usuario:

```bash
cd api && npm run build && npm run crear-admin -- --correo tu@correo.com --nombre "Tu nombre"
```

### Pruebas

```bash
cd api && npm test
```

Las pruebas usan su propia base de datos, indicada en `api/.env.test` con la variable
`TEST_DATABASE_URL`; ajústala a tu PostgreSQL. Los correos de las pruebas no salen: quedan
en memoria.

## Instalar en el servidor y actualizar

Ver `docs/despliegue.md`.
