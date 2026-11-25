import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useSesion } from '../sesion';
import { campo, mensajeDe } from '../ui';

export const MIN_LARGO_CLAVE = 8;

/** Valida la clave nueva igual que la API: devuelve el error a mostrar o null. */
export function errorClaveNueva(nueva: string, repetida: string): string | null {
  if (nueva.length < MIN_LARGO_CLAVE) return `La clave debe tener al menos ${MIN_LARGO_CLAVE} caracteres.`;
  if (nueva !== repetida) return 'Las dos claves no coinciden.';
  return null;
}

/** Al entrar con la clave temporal, el usuario crea la suya antes de usar el panel. */
export function CrearClave() {
  const { usuario, setUsuario, salir } = useSesion();
  const navegar = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario === undefined) return <div className="empty">Cargando…</div>;
  if (usuario === null) return <Navigate to="/ingresar" replace />;
  if (!usuario.debeCambiarClave) return <Navigate to="/cotizaciones" replace />;

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const nueva = campo(f, 'nueva');
    const invalida = errorClaveNueva(nueva, campo(f, 'repetida'));
    if (invalida) {
      setError(invalida);
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await api.cambiarClave({ nueva });
      setUsuario({ ...usuario, debeCambiarClave: false });
      navegar('/cotizaciones', { replace: true });
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="wrap">
      <div className="login">
        <section className="box">
          <div className="box-h" style={{ justifyContent: 'center', textAlign: 'center', flexDirection: 'column' }}>
            <h1 className="h1" style={{ fontSize: 24 }}>
              Crea tu clave
            </h1>
            <p className="sub">Hola, {usuario.nombre}. Entraste con una clave temporal: crea la tuya para seguir.</p>
          </div>
          <div className="box-b">
            <form className="formulario" onSubmit={enviar}>
              <label htmlFor="c-n">
                Clave nueva
                <input className="field" id="c-n" name="nueva" type="password" autoComplete="new-password" required minLength={MIN_LARGO_CLAVE} maxLength={200} />
              </label>
              <label htmlFor="c-r">
                Repite la clave
                <input className="field" id="c-r" name="repetida" type="password" autoComplete="new-password" required maxLength={200} />
              </label>
              <p className="small" style={{ margin: 0 }}>
                Al menos {MIN_LARGO_CLAVE} caracteres, distinta de la clave temporal.
              </p>
              {error && (
                <p className="ko small" role="alert" style={{ margin: 0 }}>
                  {error}
                </p>
              )}
              <button className="btn pri" type="submit" disabled={enviando}>
                Guardar mi clave
              </button>
              <button type="button" className="btn link" onClick={() => void salir().then(() => navegar('/ingresar', { replace: true }))}>
                Salir
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
