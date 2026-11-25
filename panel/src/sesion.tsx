import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, EVENTO_SIN_SESION, type Resumen, type UsuarioPanel } from './api';

interface Sesion {
  /** undefined: todavía no se sabe; null: sin sesión. */
  usuario: UsuarioPanel | null | undefined;
  setUsuario: (u: UsuarioPanel | null) => void;
  resumen: Resumen | null;
  refrescarResumen: () => void;
  salir: () => Promise<void>;
}

const Ctx = createContext<Sesion | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioPanel | null | undefined>(undefined);
  const [resumen, setResumen] = useState<Resumen | null>(null);

  useEffect(() => {
    api
      .yo()
      .then(setUsuario)
      .catch(() => setUsuario(null));
    const sinSesion = () => setUsuario(null);
    window.addEventListener(EVENTO_SIN_SESION, sinSesion);
    return () => window.removeEventListener(EVENTO_SIN_SESION, sinSesion);
  }, []);

  const refrescarResumen = useCallback(() => {
    api
      .resumen()
      .then(setResumen)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!usuario || usuario.debeCambiarClave) return;
    refrescarResumen();
    const id = window.setInterval(refrescarResumen, 60_000);
    return () => window.clearInterval(id);
  }, [usuario, refrescarResumen]);

  const salir = useCallback(async () => {
    try {
      await api.salir();
    } finally {
      setUsuario(null);
      setResumen(null);
    }
  }, []);

  return <Ctx.Provider value={{ usuario, setUsuario, resumen, refrescarResumen, salir }}>{children}</Ctx.Provider>;
}

export function useSesion(): Sesion {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSesion fuera de SesionProvider');
  return s;
}

/** Usuario con sesión: solo se usa dentro de las páginas protegidas. */
export function useUsuario(): UsuarioPanel {
  const { usuario } = useSesion();
  if (!usuario) throw new Error('useUsuario sin sesión');
  return usuario;
}
