import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { SesionProvider, useSesion } from './sesion';
import { ToastProvider } from './ui';
import { Ingreso } from './paginas/Ingreso';
import { CrearClave } from './paginas/CrearClave';
import { Cotizaciones } from './paginas/Cotizaciones';
import { Cotizacion } from './paginas/Cotizacion';
import { Clientes } from './paginas/Clientes';
import { Cliente } from './paginas/Cliente';
import { Mensajes } from './paginas/Mensajes';
import { Ajustes } from './paginas/Ajustes';

function Protegida() {
  const { usuario } = useSesion();
  const loc = useLocation();
  if (usuario === undefined) return <div className="empty">Cargando…</div>;
  if (usuario === null) return <Navigate to="/ingresar" replace state={{ desde: loc.pathname + loc.search }} />;
  if (usuario.debeCambiarClave) return <Navigate to="/clave" replace />;
  return <Marco />;
}

function Marco() {
  const { usuario, resumen, salir } = useSesion();
  const navegar = useNavigate();
  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="brand">
            <i>C</i>
            <span>
              CAVI <small>Panel</small>
            </span>
          </div>
          <nav className="nav" aria-label="Panel">
            <NavLink to="/cotizaciones">
              Cotizaciones {resumen && resumen.recibidas > 0 && <span className="cnt">{resumen.recibidas}</span>}
            </NavLink>
            <NavLink to="/clientes">Clientes</NavLink>
            <NavLink to="/mensajes">
              Mensajes {resumen && resumen.mensajesPendientes > 0 && <span className="cnt">{resumen.mensajesPendientes}</span>}
            </NavLink>
            <NavLink to="/ajustes">Ajustes</NavLink>
          </nav>
          <span className="who">
            {usuario?.nombre} · {usuario?.rol === 'admin' ? 'Administrador' : 'Asesor'}
          </span>
          <button
            type="button"
            className="btn sm btn-salir"
            onClick={() => {
              void salir().then(() => navegar('/ingresar', { replace: true }));
            }}
          >
            Salir
          </button>
        </div>
      </header>
      <main className="wrap principal">
        <Outlet />
      </main>
    </>
  );
}

export function App() {
  return (
    <SesionProvider>
      <ToastProvider>
        <Routes>
          <Route path="/ingresar" element={<Ingreso />} />
          <Route path="/clave" element={<CrearClave />} />
          <Route element={<Protegida />}>
            <Route index element={<Navigate to="/cotizaciones" replace />} />
            <Route path="/cotizaciones" element={<Cotizaciones />} />
            <Route path="/cotizaciones/:numero" element={<Cotizacion />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/clientes/:id" element={<Cliente />} />
            <Route path="/mensajes" element={<Mensajes />} />
            <Route path="/ajustes" element={<Ajustes />} />
            <Route path="*" element={<Navigate to="/cotizaciones" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </SesionProvider>
  );
}
