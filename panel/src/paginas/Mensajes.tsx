import { useState } from 'react';
import { api, type Mensaje } from '../api';
import { fechaCorta } from '../formato';
import { useSesion } from '../sesion';
import { EstadoCarga, mensajeDe, useCarga, useToast } from '../ui';

export function Mensajes() {
  const toast = useToast();
  const { refrescarResumen } = useSesion();
  const { datos, setDatos, error, cargando, recargar } = useCarga(() => api.mensajes(), []);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const atender = async (m: Mensaje) => {
    setOcupado(m.id);
    try {
      const hecho = await api.atender(m.id);
      setDatos((d) => (d ? { pendientes: d.pendientes.filter((x) => x.id !== m.id), atendidos: [hecho, ...d.atendidos] } : d));
      refrescarResumen();
      toast('Mensaje marcado como atendido');
    } catch (e) {
      toast(mensajeDe(e));
      recargar();
    } finally {
      setOcupado(null);
    }
  };

  const tarjeta = (m: Mensaje) => (
    <section className="box" key={m.id}>
      <div className="box-h">
        <div style={{ minWidth: 0 }}>
          <h2 className="h2">{m.nombre}</h2>
          <span className="small">
            {m.empresa ? `${m.empresa} · ` : ''}
            {fechaCorta(m.creadoEn)}
          </span>
        </div>
        {m.atendidoEn ? (
          <span className="small">Atendido{m.atendidoPor ? ` por ${m.atendidoPor}` : ''}</span>
        ) : (
          <button className="btn sm" type="button" disabled={ocupado === m.id} onClick={() => void atender(m)}>
            Marcar atendido
          </button>
        )}
      </div>
      <div className="box-b">
        <p style={{ margin: '0 0 10px', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{m.mensaje}</p>
        <span className="small" style={{ overflowWrap: 'anywhere' }}>
          {m.telefono} · <a href={`mailto:${m.correo}`}>{m.correo}</a>
        </span>
      </div>
    </section>
  );

  return (
    <>
      <div className="head">
        <div>
          <h1 className="h1">Mensajes</h1>
          <p className="sub">Lo que llega por el formulario de contacto del sitio. También llega por correo a CAVI.</p>
        </div>
      </div>
      {!datos || error ? (
        <EstadoCarga cargando={cargando} error={error} reintentar={recargar} />
      ) : (
        <>
          {datos.pendientes.length ? (
            datos.pendientes.map(tarjeta)
          ) : (
            <div className="box">
              <div className="empty">No hay mensajes por atender.</div>
            </div>
          )}
          {datos.atendidos.length > 0 && (
            <>
              <p className="lbl" style={{ margin: '26px 0 10px' }}>
                Atendidos
              </p>
              {datos.atendidos.map(tarjeta)}
            </>
          )}
        </>
      )}
    </>
  );
}
