import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ErrorApi, type Estado } from './api';
import { ETIQUETA_ESTADO } from './formato';

export function Badge({ estado }: { estado: Estado }) {
  return <span className={`badge b-${estado}`}>{ETIQUETA_ESTADO[estado]}</span>;
}

export const mensajeDe = (e: unknown): string =>
  e instanceof ErrorApi ? e.message : 'Algo salió mal. Vuelve a intentarlo en un momento.';

/** Carga datos al montar y cada vez que cambian las dependencias; ignora respuestas viejas. */
export function useCarga<T>(cargar: () => Promise<T>, deps: readonly unknown[]) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const turno = useRef(0);

  const recargar = useCallback(() => {
    const yo = ++turno.current;
    setCargando(true);
    cargar()
      .then((d) => {
        if (yo !== turno.current) return;
        setDatos(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (yo !== turno.current) return;
        if (e instanceof ErrorApi && e.status === 401) return;
        setError(mensajeDe(e));
      })
      .finally(() => {
        if (yo === turno.current) setCargando(false);
      });
  }, deps);

  useEffect(recargar, [recargar]);
  return { datos, setDatos, error, cargando, recargar };
}

export function EstadoCarga({ cargando, error, reintentar }: { cargando: boolean; error: string | null; reintentar: () => void }) {
  if (error) {
    return (
      <div className="box">
        <div className="empty">
          <p className="ko" role="alert" style={{ margin: '0 0 12px' }}>
            {error}
          </p>
          <button type="button" className="btn sm" onClick={reintentar}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }
  if (cargando) return <div className="empty">Cargando…</div>;
  return null;
}

const ToastCtx = createContext<(texto: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [texto, setTexto] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const mostrar = useCallback((t: string) => {
    setTexto(t);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setTexto(null), 2600);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <ToastCtx.Provider value={mostrar}>
      {children}
      {texto && (
        <div className="toast" role="status">
          {texto}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

/**
 * Ventana emergente con un formulario. `alEnviar` devuelve el mensaje de error a mostrar,
 * o null para cerrarla.
 */
export function Dialogo({
  titulo,
  textoEnviar,
  alEnviar,
  alCerrar,
  children,
}: {
  titulo: string;
  textoEnviar: string;
  alEnviar: (form: HTMLFormElement) => Promise<string | null>;
  alCerrar: () => void;
  children: ReactNode;
}) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const cerrar = useRef(alCerrar);
  cerrar.current = alCerrar;

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('input,textarea,select')?.focus();
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar.current();
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError(null);
    const form = e.currentTarget;
    try {
      const err = await alEnviar(form);
      if (err) setError(err);
      else alCerrar();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="dlg" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="dlg-c">
        <div className="box-h">
          <h2 className="h2">{titulo}</h2>
        </div>
        <form ref={ref} onSubmit={enviar}>
          <div className="box-b">
            {children}
            {error && (
              <p className="ko small" role="alert" style={{ margin: 0 }}>
                {error}
              </p>
            )}
          </div>
          <div className="actions">
            <button className="btn pri" type="submit" disabled={enviando}>
              {textoEnviar}
            </button>
            <button className="btn" type="button" onClick={alCerrar}>
              Volver
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Valor de un campo del formulario, sin espacios al inicio ni al final; cadena vacía si el campo no existe. */
export function campo(form: HTMLFormElement, nombre: string): string {
  const el = form.elements.namedItem(nombre);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return el.value.trim();
  return '';
}

export function Paginas({ pagina, total, porPagina, ir }: { pagina: number; total: number; porPagina: number; ir: (p: number) => void }) {
  const ultima = Math.max(1, Math.ceil(total / porPagina));
  if (ultima <= 1) return null;
  return (
    <div className="paginas">
      <button type="button" className="btn sm" disabled={pagina <= 1} onClick={() => ir(pagina - 1)}>
        Anterior
      </button>
      <span className="small">
        Página {pagina} de {ultima}
      </span>
      <button type="button" className="btn sm" disabled={pagina >= ultima} onClick={() => ir(pagina + 1)}>
        Siguiente
      </button>
    </div>
  );
}
