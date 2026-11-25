# Instalación y actualización en el servidor

El sitio y el panel son archivos estáticos que sirve nginx. La API es un proceso de Node.js
en el puerto 3250, y nginx le pasa todo lo que empieza con `/api/`.

## Instalación (una sola vez)

### 1. Requisitos

- Node.js 24 LTS, en su última versión (24.22.3 a la fecha). Ver «Versión de Node.js» al final.
- PM2, para mantener la API en marcha: `npm install -g pm2`.
- PostgreSQL.
- nginx con certificado HTTPS para el dominio.

### 2. Base de datos

En PostgreSQL:

```sql
CREATE ROLE cavi LOGIN PASSWORD '<clave segura>';
CREATE DATABASE cavi OWNER cavi;
```

Comprobar la conexión:

```bash
psql "postgresql://cavi:<clave>@127.0.0.1:5432/cavi" -c "select 1"
```

### 3. Buzón de correo

Conviene usar un buzón dedicado solo a enviar, por ejemplo `no-responder@repcavi.com`, y no
el correo de trabajo. Así, si el proveedor lo frena por volumen, CAVI no se queda sin su
correo.

Del proveedor hacen falta:
- servidor SMTP;
- puerto: 465 (TLS directo) o 587 (STARTTLS);
- usuario y clave;
- cuántos correos permite enviar por hora y por día.

El dominio debe tener SPF y DKIM configurados para ese buzón; si no, los correos llegan a
spam.

### 4. Código y configuración

```bash
git clone <repositorio> /srv/cavi-web
cd /srv/cavi-web
cp api/.env.example api/.env
chmod 600 api/.env
```

En `api/.env`, cambiar al menos estos valores:

```
NODE_ENV=production
DATABASE_URL=postgresql://cavi:<clave>@127.0.0.1:5432/cavi?schema=public
JWT_SECRET=<el resultado de: openssl rand -base64 48>
SITIO_URL=https://<dominio>
COOKIE_SECURE=true
TRUST_PROXY=true
LOG_PRETTY=false
SMTP_HOST=<servidor SMTP>
SMTP_PORT=465
SMTP_SECURE=true                 # false si el puerto es 587
SMTP_USER=no-responder@repcavi.com
SMTP_PASSWORD=<clave del buzón>
CORREO_REMITENTE="Repuestos CAVI <no-responder@repcavi.com>"
CORREO_AVISOS_CAVI=marketing@repcavi.com
CORREO_TOPE_HORA=200
FOTOS_RETENCION_DIAS=180
```

- `CORREO_AVISOS_CAVI`: la dirección que recibe los avisos de solicitudes nuevas,
  aceptadas, canceladas y mensajes de contacto.
- `CORREO_TOPE_HORA`: el máximo de correos por hora entre todos los tipos. Debe quedar por
  debajo del límite del proveedor. Un correo que lo pasa queda sin enviar y se reenvía
  desde el panel.
- `FOTOS_RETENCION_DIAS`: los días que se guarda la foto de una cotización entregada o
  cancelada, contados desde su último movimiento. La API las borra sola.

**`JWT_SECRET` se define una vez y no se cambia.** Si se cambia:
- se cierran todas las sesiones;
- las claves temporales ya enviadas dejan de servir, y el cliente pide otra con
  «¿Olvidaste tu clave?»;
- los correos que estaban por salir quedan sin enviar y hay que reenviarlos desde el
  panel.

Las fotos de los vehículos quedan en `api/archivos/`. Esa carpeta tiene que entrar en el
respaldo del servidor, igual que la base de datos.

### 5. Compilar

```bash
cd /srv/cavi-web
npm ci --prefix api && (cd api && npx prisma generate && npx prisma migrate deploy && npm run build)
npm ci --prefix web && (cd web && npm run build)        # deja el sitio en web/out
npm ci --prefix panel && (cd panel && npm run build)    # deja el panel en panel/dist
```

`prisma migrate deploy` crea las tablas en la base de datos.

### 6. Dejar la API en marcha con PM2

PM2 inicia la API, la reinicia si se cae y la vuelve a levantar cuando se reinicia el
servidor.

```bash
cd /srv/cavi-web/api
pm2 start dist/server.js --name cavi-api --max-memory-restart 300M
pm2 save
pm2 startup        # muestra un comando; copiarlo y ejecutarlo una vez
```

La API tiene que correr como **un solo proceso**: no usar `-i` ni el modo cluster de PM2.
Los límites de seguridad por IP y el control de los correos viven en su memoria, y dos
copias llevarían cuentas separadas.

`pm2 start` se ejecuta desde `api/` porque la API lee su configuración de `api/.env` en
la carpeta donde arranca.

Comprobar que responde: `curl -s http://127.0.0.1:3250/api/health` debe dar `{"ok":true}`.

**Si el servidor comparte PM2 con otras aplicaciones:** antes de `pm2 save`, revisar con
`pm2 ls` que todas estén como deben. `pm2 save` guarda la lista completa, y una aplicación
que esté detenida en ese momento no vuelve a arrancar cuando se reinicie el servidor.

### 7. nginx

Copiar `nginx/cavi.conf.ejemplo` a la configuración de nginx. Reemplazar `<dominio>`,
`<ruta-del-repo>` (por ejemplo `/srv/cavi-web`) y las rutas de los certificados. Después:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 8. Primer administrador del panel

```bash
cd /srv/cavi-web/api && npm run crear-admin -- --correo <correo> --nombre "<Nombre>"
```

El comando muestra una clave temporal. Hay que entregársela al administrador por un medio
privado. Al entrar al panel, el sistema le pide crear su propia clave.

### 9. Comprobaciones

- `curl -s https://<dominio>/api/health` responde `{"ok":true}`.
- `https://<dominio>/` muestra el sitio y `https://<dominio>/panel/` muestra el panel.
- `https://<dominio>/logo-cavi-correo.png` carga, porque los correos toman el logo de ahí.
- Enviar una solicitud de prueba con un correo propio. Deben llegar la confirmación y el
  aviso a `CORREO_AVISOS_CAVI`. Después, cancelarla desde el portal.
- `pm2 ls` muestra `cavi-api` en línea (`online`).

## Actualizar a una versión nueva

```bash
cd /srv/cavi-web
git pull
```

Después se repite el paso 5 («Compilar»), que también aplica los cambios pendientes de la
base de datos, y se reinicia la API:

```bash
pm2 reload cavi-api
```

Si la compilación falla, no se reinicia la API: sigue corriendo la versión anterior.

## Si algo sale mal

- Registros de la API: `pm2 logs cavi-api`.
- Correos que no salieron: en el panel, en el detalle de cada cotización, sección
  Correos. Ahí se ve el motivo y el botón para reenviar.
- La API corre como un solo proceso. No se debe levantar una segunda copia.

## Versión de Node.js

Revisado el 25 de noviembre de 2026 contra las versiones oficiales de nodejs.org:

| Rama | Última versión | Soporte hasta | Uso |
|---|---|---|---|
| 26 (LTS activa) | 26.13.1 | abril de 2029 | La más reciente. El sistema no se probó con ella. |
| **24 (LTS)** | **24.22.3** | abril de 2028 | **Recomendada.** Pasan todas las pruebas, compilan las tres partes y la API arranca. |
| 22 (LTS en mantenimiento) | 22.23.5 | abril de 2027 | Funciona, pero termina su soporte pronto. |

Las tres versiones de la tabla incluyen la actualización de seguridad del 11 de noviembre de
2026, que corrige 16 fallos (7 de gravedad alta en http, http2 y tls). **Cualquier versión
anterior a esas tiene fallos conocidos**, incluida la 22.23.4.

Node.js publica actualizaciones de seguridad cada pocas semanas. Conviene revisar
https://nodejs.org/en/blog/vulnerability y actualizar dentro de la misma rama (por ejemplo,
de 24.22.3 a 24.22.4). Después de actualizar Node.js: `pm2 update` y `pm2 reload cavi-api`.
