import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api, ErrorApi } from '../api';
import { useSesion } from '../sesion';
import { campo, mensajeDe } from '../ui';

function destino(estado: unknown): string {
  if (typeof estado === 'object' && estado !== null && 'desde' in estado && typeof estado.desde === 'string' && estado.desde.startsWith('/')) {
    return estado.desde;
  }
  return '/cotizaciones';
}

export function Ingreso() {
  const { usuario, setUsuario } = useSesion();
  const loc = useLocation();
  const navegar = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={usuario.debeCambiarClave ? '/clave' : destino(loc.state)} replace />;

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    setEnviando(true);
    setError(null);
    try {
      const { usuario: u } = await api.ingresar(campo(f, 'correo'), campo(f, 'clave'));
      setUsuario(u);
      navegar(u.debeCambiarClave ? '/clave' : destino(loc.state), { replace: true });
    } catch (err) {
      setError(err instanceof ErrorApi && (err.status === 401 || err.status === 400) ? 'Correo o clave incorrectos.' : mensajeDe(err));
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
              Panel de CAVI
            </h1>
            <p className="sub">Ingresa con el correo que te dio el administrador.</p>
          </div>
          <div className="box-b">
            <form className="formulario" onSubmit={enviar}>
              <label htmlFor="l-c">
                Correo
                <input className="field" id="l-c" name="correo" type="email" autoComplete="username" required maxLength={200} />
              </label>
              <label htmlFor="l-p">
                Clave
                <input className="field" id="l-p" name="clave" type="password" autoComplete="current-password" required maxLength={200} />
              </label>
              {error && (
                <p className="ko small" role="alert" style={{ margin: 0 }}>
                  {error}
                </p>
              )}
              <button className="btn pri" type="submit" disabled={enviando}>
                Ingresar
              </button>
              <p className="small" style={{ margin: 0, textAlign: 'center' }}>
                ¿Olvidaste tu clave? Pídele al administrador que te asigne una nueva.
              </p>
            </form>
          </div>
        </section>
        <p className="small" style={{ textAlign: 'center' }}>
          El primer administrador se crea al instalar el sistema. Después, él agrega a los asesores desde Ajustes.
        </p>
      </div>
    </main>
  );
}
