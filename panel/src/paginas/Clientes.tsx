import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { fecha } from '../formato';
import { EstadoCarga, Paginas, useCarga } from '../ui';

export function Clientes() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const pagina = Math.max(1, Number(params.get('pagina')) || 1);
  const [texto, setTexto] = useState(q);

  useEffect(() => {
    if (texto.trim() === q) return;
    const id = window.setTimeout(() => setParams(texto.trim() ? { q: texto.trim() } : {}, { replace: true }), 300);
    return () => window.clearTimeout(id);
  }, [texto, q, setParams]);

  const { datos, error, cargando, recargar } = useCarga(() => api.clientes({ q, pagina }), [q, pagina]);

  return (
    <>
      <div className="head">
        <div>
          <h1 className="h1">Clientes</h1>
          <p className="sub">Las cuentas se crean solas cuando alguien pide su primera cotización.</p>
        </div>
      </div>
      <div className="filters">
        <input
          className="field q"
          type="search"
          placeholder="Buscar por nombre, empresa o correo"
          aria-label="Buscar por nombre, empresa o correo"
          maxLength={200}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </div>
      {!datos || error ? (
        <EstadoCarga cargando={cargando} error={error} reintentar={recargar} />
      ) : (
        <>
          <div className="list" aria-busy={cargando}>
            <div className="row h cli">
              <span>Cliente</span>
              <span>Correo</span>
              <span>Cotizaciones</span>
              <span>Desde</span>
            </div>
            {datos.filas.length === 0 && <div className="empty">No hay clientes con esa búsqueda.</div>}
            {datos.filas.map((cl) => (
              <Link className="row cli" key={cl.id} to={`/clientes/${cl.id}`}>
                <span className="trunc">
                  <span className="strong">{cl.nombre}</span>
                  <div className="small trunc">{cl.empresa || 'Sin empresa'}</div>
                </span>
                <span className="small trunc">{cl.correo}</span>
                <span className="small">
                  {cl.cotizaciones}
                  <span className="solo-movil"> {cl.cotizaciones === 1 ? 'cotización' : 'cotizaciones'}</span>
                </span>
                <span className="small">{fecha(cl.creadoEn)}</span>
              </Link>
            ))}
          </div>
          <Paginas
            pagina={datos.pagina}
            total={datos.total}
            porPagina={datos.porPagina}
            ir={(n) => {
              const p = new URLSearchParams(params);
              p.set('pagina', String(n));
              setParams(p, { replace: true });
            }}
          />
        </>
      )}
    </>
  );
}
