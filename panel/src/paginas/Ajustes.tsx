import { useState } from 'react';
import { api, type Rol, type UsuarioPanel } from '../api';
import { useUsuario } from '../sesion';
import { campo, Dialogo, EstadoCarga, mensajeDe, useCarga, useToast } from '../ui';
import { errorClaveNueva, MIN_LARGO_CLAVE } from './CrearClave';

const ETIQUETA_ROL: Record<Rol, string> = { admin: 'Administrador', asesor: 'Asesor' };
const esRol = (v: string): v is Rol => v === 'admin' || v === 'asesor';

function Usuarios({ yo }: { yo: UsuarioPanel }) {
  const toast = useToast();
  const { datos, setDatos, error, cargando, recargar } = useCarga(() => api.usuarios(), []);
  const [ventana, setVentana] = useState<'nuevo' | UsuarioPanel | null>(null);

  const reemplazar = (u: UsuarioPanel) =>
    setDatos((d) => (d ? { filas: d.filas.some((x) => x.id === u.id) ? d.filas.map((x) => (x.id === u.id ? u : x)) : [...d.filas, u] } : d));

  return (
    <section className="box">
      <div className="box-h">
        <h2 className="h2">Usuarios del panel</h2>
        <button className="btn sm" type="button" onClick={() => setVentana('nuevo')}>
          Agregar usuario
        </button>
      </div>
      {!datos || error ? (
        <EstadoCarga cargando={cargando} error={error} reintentar={recargar} />
      ) : (
        datos.filas.map((u) => (
          <button type="button" className="fila-boton" key={u.id} onClick={() => setVentana(u)} aria-label={`Editar a ${u.nombre}`}>
            <div style={{ minWidth: 0 }}>
              <div className="strong">
                {u.nombre} {!u.activo && <span className="chip">Desactivado</span>}
              </div>
              <div className="small trunc">{u.correo}</div>
            </div>
            <span className="chip">{ETIQUETA_ROL[u.rol]}</span>
          </button>
        ))
      )}

      {ventana === 'nuevo' && (
        <Dialogo
          titulo="Agregar usuario"
          textoEnviar="Agregar"
          alCerrar={() => setVentana(null)}
          alEnviar={async (f) => {
            const rol = campo(f, 'rol');
            if (!esRol(rol)) return 'Elige el rol.';
            try {
              reemplazar(await api.crearUsuario({ nombre: campo(f, 'nombre'), correo: campo(f, 'correo'), rol }));
              toast('Usuario agregado');
              return null;
            } catch (e) {
              return mensajeDe(e);
            }
          }}
        >
          <label htmlFor="u-n">
            Nombre
            <input className="field" id="u-n" name="nombre" required maxLength={120} />
          </label>
          <label htmlFor="u-c">
            Correo
            <input className="field" id="u-c" name="correo" type="email" required maxLength={200} />
          </label>
          <label htmlFor="u-r">
            Rol
            <select className="field" id="u-r" name="rol" defaultValue="asesor">
              <option value="asesor">Asesor</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <p className="small" style={{ margin: 0 }}>
            Le llega un correo con una clave temporal; al entrar crea la suya.
          </p>
        </Dialogo>
      )}

      {ventana !== null && ventana !== 'nuevo' && (
        <Dialogo
          titulo={`Editar a ${ventana.nombre}`}
          textoEnviar="Guardar cambios"
          alCerrar={() => setVentana(null)}
          alEnviar={async (f) => {
            const esYo = ventana.id === yo.id;
            const rol = campo(f, 'rol');
            const activo = f.elements.namedItem('activo');
            const clave = f.elements.namedItem('clave');
            try {
              const u = await api.editarUsuario(ventana.id, {
                nombre: campo(f, 'nombre'),
                ...(!esYo && esRol(rol) ? { rol } : {}),
                ...(!esYo && activo instanceof HTMLInputElement ? { activo: activo.checked } : {}),
                ...(clave instanceof HTMLInputElement && clave.checked ? { claveTemporalNueva: true as const } : {}),
              });
              reemplazar(u);
              toast(clave instanceof HTMLInputElement && clave.checked ? `Cambios guardados. Le enviamos una clave temporal a ${u.correo}.` : 'Cambios guardados');
              return null;
            } catch (e) {
              return mensajeDe(e);
            }
          }}
        >
          <label htmlFor="e-n">
            Nombre
            <input className="field" id="e-n" name="nombre" required maxLength={120} defaultValue={ventana.nombre} />
          </label>
          <p className="small" style={{ margin: 0 }}>
            Correo: <b>{ventana.correo}</b>
          </p>
          {ventana.id === yo.id ? (
            <p className="small" style={{ margin: 0 }}>
              Tu propio rol y tu acceso los cambia otro administrador.
            </p>
          ) : (
            <>
              <label htmlFor="e-r">
                Rol
                <select className="field" id="e-r" name="rol" defaultValue={ventana.rol}>
                  <option value="asesor">Asesor</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>
              <label className="check">
                <input type="checkbox" name="activo" defaultChecked={ventana.activo} /> Puede ingresar al panel
              </label>
              <label className="check">
                <input type="checkbox" name="clave" /> Enviarle una clave temporal nueva
              </label>
            </>
          )}
        </Dialogo>
      )}
    </section>
  );
}

function Boletin() {
  const { datos, error, cargando, recargar } = useCarga(() => api.boletin(), []);
  return (
    <section className="box">
      <div className="box-h">
        <h2 className="h2">Boletín</h2>
      </div>
      <div className="box-b">
        {!datos || error ? (
          <EstadoCarga cargando={cargando} error={error} reintentar={recargar} />
        ) : (
          <p style={{ margin: 0 }}>
            <b style={{ fontFamily: 'Archivo, system-ui, sans-serif', fontSize: 28, color: 'var(--title)' }}>{datos.suscriptores.toLocaleString('en-US')}</b>{' '}
            <span className="small">suscriptores</span>
          </p>
        )}
        <p className="small">
          Correos que se anotaron en el pie de página del sitio. El sitio no envía boletines: descárgalos para usarlos en tu herramienta de correo.
        </p>
        <a className="btn" href={api.urlBoletinCsv} download="suscriptores-boletin.csv">
          Descargar lista (CSV)
        </a>
      </div>
    </section>
  );
}

function MiClave() {
  const toast = useToast();
  const [abierta, setAbierta] = useState(false);
  return (
    <section className="box">
      <div className="box-h">
        <h2 className="h2">Mi clave</h2>
      </div>
      <div className="box-b">
        <p className="small" style={{ marginTop: 0 }}>
          Cámbiala cuando quieras. Si la olvidas, pídele al administrador una clave temporal.
        </p>
        <button className="btn" type="button" onClick={() => setAbierta(true)}>
          Cambiar mi clave
        </button>
      </div>
      {abierta && (
        <Dialogo
          titulo="Cambiar mi clave"
          textoEnviar="Guardar mi clave"
          alCerrar={() => setAbierta(false)}
          alEnviar={async (f) => {
            const nueva = campo(f, 'nueva');
            const invalida = errorClaveNueva(nueva, campo(f, 'repetida'));
            if (invalida) return invalida;
            try {
              await api.cambiarClave({ actual: campo(f, 'actual'), nueva });
              toast('Clave cambiada');
              return null;
            } catch (e) {
              return mensajeDe(e);
            }
          }}
        >
          <label htmlFor="k-a">
            Clave actual
            <input className="field" id="k-a" name="actual" type="password" autoComplete="current-password" required maxLength={200} />
          </label>
          <label htmlFor="k-n">
            Clave nueva
            <input className="field" id="k-n" name="nueva" type="password" autoComplete="new-password" required minLength={MIN_LARGO_CLAVE} maxLength={200} />
          </label>
          <label htmlFor="k-r">
            Repite la clave nueva
            <input className="field" id="k-r" name="repetida" type="password" autoComplete="new-password" required maxLength={200} />
          </label>
        </Dialogo>
      )}
    </section>
  );
}

export function Ajustes() {
  const yo = useUsuario();
  const admin = yo.rol === 'admin';
  return (
    <>
      <div className="head">
        <div>
          <h1 className="h1">Ajustes</h1>
          <p className="sub">{admin ? 'Solo los administradores cambian estos datos.' : 'Los usuarios y el boletín los maneja un administrador.'}</p>
        </div>
      </div>
      <div className="grid2">
        {admin && <Usuarios yo={yo} />}
        {admin && <Boletin />}
        <MiClave />
      </div>
    </>
  );
}
