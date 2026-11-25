import { Link, useParams } from 'react-router-dom';
import { api, ErrorApi } from '../api';
import { fecha } from '../formato';
import { EstadoCarga, useCarga } from '../ui';
import { FilaCot } from './Cotizaciones';

export function Cliente() {
  const { id = '' } = useParams();
  const { datos: cl, error, cargando, recargar } = useCarga(
    () =>
      api.cliente(id).catch((e: unknown) => {
        if (e instanceof ErrorApi && (e.status === 404 || e.status === 400)) return null;
        throw e;
      }),
    [id],
  );

  const volver = (
    <Link className="back" to="/clientes">
      ← Volver a clientes
    </Link>
  );
  if (!cl) {
    return (
      <>
        {volver}
        {!cargando && !error ? <div className="empty">No existe ese cliente.</div> : <EstadoCarga cargando={cargando} error={error} reintentar={recargar} />}
      </>
    );
  }

  return (
    <>
      {volver}
      <div className="head">
        <div>
          <h1 className="h1">{cl.nombre}</h1>
          <p className="sub">
            {cl.empresa || 'Sin empresa'} · cliente desde {fecha(cl.creadoEn)}
          </p>
        </div>
      </div>
      <div className="det">
        <div>
          <div className="list">
            <div className="row h">
              <span>Número</span>
              <span>Repuestos</span>
              <span>Entrega</span>
              <span>Estado</span>
              <span className="r">Total</span>
            </div>
            {cl.cotizaciones.length === 0 && <div className="empty">Todavía no tiene cotizaciones.</div>}
            {cl.cotizaciones.map((c) => (
              <FilaCot key={c.numero} c={c} conCliente={false} />
            ))}
          </div>
        </div>
        <section className="box">
          <div className="box-h">
            <h2 className="h2">Datos de contacto</h2>
          </div>
          <div className="box-b">
            <dl className="kv">
              <dt>Teléfono</dt>
              <dd>{cl.telefono}</dd>
              <dt>Correo</dt>
              <dd>{cl.correo}</dd>
              {cl.rtn && (
                <>
                  <dt>RTN</dt>
                  <dd>{cl.rtn}</dd>
                </>
              )}
            </dl>
            <p className="small" style={{ margin: '12px 0 0' }}>
              Los datos los edita el cliente desde su portal.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
