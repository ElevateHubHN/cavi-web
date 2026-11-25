import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, type Estado, type FilaCotizacion } from '../api';
import { entregaCorta, fecha, numeroCT, SUCURSALES, sucursalCorta, textoTotal } from '../formato';
import { useSesion } from '../sesion';
import { Badge, EstadoCarga, Paginas, useCarga } from '../ui';

const PESTANAS: { estado: Estado | 'todas'; texto: string }[] = [
  { estado: 'recibida', texto: 'Recibidas' },
  { estado: 'en_revision', texto: 'En revisión' },
  { estado: 'cotizada', texto: 'Cotizadas' },
  { estado: 'confirmada', texto: 'Confirmadas' },
  { estado: 'todas', texto: 'Todas' },
];

const esPestana = (v: string | null): v is Estado | 'todas' => PESTANAS.some((p) => p.estado === v);

export function FilaCot({ c, conCliente = true }: { c: FilaCotizacion; conCliente?: boolean }) {
  const t = textoTotal(c);
  return (
    <Link className="row" to={`/cotizaciones/${c.numero}`}>
      <span className="c-num">
        <span className="num">{numeroCT(c.numero)}</span>
        {c.estado === 'recibida' && <span className="new">nueva</span>}
        {conCliente && <div className="small">{fecha(c.creadaEn)}</div>}
      </span>
      {conCliente ? (
        <span className="c-cli trunc">
          <span className="strong">{c.cliente.nombre}</span>
          {c.cliente.empresa && <span className="small"> · {c.cliente.empresa}</span>}
          <div className="small trunc">
            {c.piezas} {c.piezas === 1 ? 'repuesto' : 'repuestos'}
            {c.asesor ? ` · ${c.asesor}` : ''}
          </div>
        </span>
      ) : (
        <span className="c-cli small">
          {c.piezas} · {fecha(c.creadaEn)}
        </span>
      )}
      <span className="c-suc small trunc">{entregaCorta(c.entrega)}</span>
      <span className="c-badge">
        <Badge estado={c.estado} />
      </span>
      <span className={`c-tot r ${t.conPrecio ? 'strong' : 'small'}`}>{t.texto}</span>
    </Link>
  );
}

export function Cotizaciones() {
  const [params, setParams] = useSearchParams();
  const { refrescarResumen } = useSesion();
  const crudo = params.get('estado');
  const estado = esPestana(crudo) ? crudo : 'recibida';
  const sucursal = params.get('sucursal') ?? '';
  const q = params.get('q') ?? '';
  const pagina = Math.max(1, Number(params.get('pagina')) || 1);
  const [texto, setTexto] = useState(q);

  const cambiar = (cambios: Record<string, string>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(cambios)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    if (!('pagina' in cambios)) p.delete('pagina');
    setParams(p, { replace: true });
  };

  useEffect(() => {
    if (texto.trim() === q) return;
    const id = window.setTimeout(() => cambiar({ q: texto.trim() }), 300);
    return () => window.clearTimeout(id);
  }, [texto]);

  const { datos, error, cargando, recargar } = useCarga(
    () => api.cotizaciones({ estado: estado === 'todas' ? undefined : estado, sucursal, q, pagina }),
    [estado, sucursal, q, pagina],
  );

  useEffect(refrescarResumen, [datos, refrescarResumen]);

  return (
    <>
      <div className="head">
        <div>
          <h1 className="h1">Cotizaciones</h1>
          <p className="sub">Las solicitudes que llegan del sitio. Las recibidas esperan que alguien las tome.</p>
        </div>
      </div>
      <div className="tabs" role="group" aria-label="Estado">
        {PESTANAS.map((p) => (
          <button key={p.estado} type="button" className="tab" aria-pressed={estado === p.estado} onClick={() => cambiar({ estado: p.estado })}>
            {p.texto} <span>{datos ? datos.contadores[p.estado] : '·'}</span>
          </button>
        ))}
      </div>
      <div className="filters">
        <input
          className="field q"
          type="search"
          placeholder="Buscar por número, cliente o correo"
          aria-label="Buscar por número, cliente o correo"
          value={texto}
          maxLength={200}
          onChange={(e) => setTexto(e.target.value)}
        />
        <select className="field" aria-label="Sucursal" value={sucursal} onChange={(e) => cambiar({ sucursal: e.target.value })}>
          <option value="">Todas las sucursales</option>
          {SUCURSALES.map((s) => (
            <option key={s} value={s}>
              {sucursalCorta(s)}
            </option>
          ))}
          <option value="envio">Envío a dirección</option>
        </select>
      </div>
      {!datos || error ? (
        <EstadoCarga cargando={cargando} error={error} reintentar={recargar} />
      ) : (
        <>
          <div className="list" aria-busy={cargando}>
            <div className="row h">
              <span>Número</span>
              <span>Cliente</span>
              <span>Entrega</span>
              <span>Estado</span>
              <span className="r">Total</span>
            </div>
            {datos.filas.length ? datos.filas.map((c) => <FilaCot key={c.numero} c={c} />) : <div className="empty">No hay cotizaciones con estos filtros.</div>}
          </div>
          <Paginas pagina={datos.pagina} total={datos.total} porPagina={datos.porPagina} ir={(n) => cambiar({ pagina: String(n) })} />
        </>
      )}
    </>
  );
}
