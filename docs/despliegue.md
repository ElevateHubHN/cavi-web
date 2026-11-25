# Instalación y actualización en el servidor

El sitio y el panel son archivos estáticos que sirve nginx. La API es un proceso de Node.js
en el puerto 3250, y nginx le pasa todo lo que empieza con `/api/`.

## Instalación (una sola vez)

### 1. Requisitos

- Node.js 22.23.4 o más reciente (las versiones anteriores tienen un fallo de seguridad).
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

### 6. Dejar la API en marcha

La API se inicia con `node dist/server.js` desde la carpeta `api/`. Tiene que correr como
**un solo proceso**, porque los límites de seguridad por IP y el control de los correos
viven en su memoria; dos copias a la vez llevarían cuentas separadas.

Para que arranque con el servidor y se reinicie si se cae, se puede usar systemd. Ejemplo
de `/etc/systemd/system/cavi-api.service`:

```ini
[Unit]
Description=API de Repuestos CAVI
After=network.target postgresql.service

[Service]
WorkingDirectory=/srv/cavi-web/api
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
User=<usuario del sitio>
MemoryMax=400M

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cavi-api
```

Comprobar que responde: `curl -s http://127.0.0.1:3250/api/health` debe dar `{"ok":true}`.

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
- `systemctl status cavi-api` muestra el servicio activo.

## Actualizar a una versión nueva

```bash
cd /srv/cavi-web
git pull
```

Después se repite el paso 5 («Compilar»), que también aplica los cambios pendientes de la
base de datos, y se reinicia la API:

```bash
sudo systemctl restart cavi-api
```

Si la compilación falla, no se reinicia la API: sigue corriendo la versión anterior.

## Si algo sale mal

- Registros de la API: `journalctl -u cavi-api -n 200`.
- Correos que no salieron: en el panel, en el detalle de cada cotización, sección
  Correos. Ahí se ve el motivo y el botón para reenviar.
- La API corre como un solo proceso. No se debe levantar una segunda copia.
