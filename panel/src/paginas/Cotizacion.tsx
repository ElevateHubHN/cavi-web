import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ErrorApi, type AccionEstado, type CanalFuera, type DetalleCotizacion, type Estado } from '../api';
import {
  CANALES_FUERA,
  centavos,
  enlaceWhatsApp,
  ETIQUETA_CANAL,
  ETIQUETA_CORREO,
  ETIQUETA_ESTADO,
  fechaCorta,
  fechaHora,
  leerPrecio,
  lempiras,
  lempirasDeCentavos,
  MOTIVOS_CANCELACION,
  numeroCT,
  numeroDesdeTexto,
  ORDEN_ESTADOS,
  precioATexto,
  textoCambio,
  textoTotal,
} from '../formato';
import { useSesion } from '../sesion';
import { Badge, campo, Dialogo, EstadoCarga, mensajeDe, useCarga, useToast } from '../ui';

type Ventana = 'fuera' | 'mover' | 'cancelar' | null;

const esCanalFuera = (v: string): v is CanalFuera => CANALES_FUERA.some((c) => c.valor === v);
const esEstadoMovible = (v: string): v is Exclude<Estado, 'cancelada'> => ORDEN_ESTADOS.some((e) => e === v);
const etiquetaCanalFuera = (c: CanalFuera) => CANALES_FUERA.find((x) => x.valor === c)?.etiqueta ?? c;

function SelectorCanal() {
  return (
    <label htmlFor="d-c">
      Por dónde
      <select className="field" id="d-c" name="canal">
        {CANALES_FUERA.map((c) => (
          <option key={c.valor} value={c.valor}>
            {c.etiqueta}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Cotizacion() {
  const params = useParams();
  const numero = numeroDesdeTexto(params.numero) ?? 0;
  const valido = numero > 0;
  const toast = useToast();
  const { refrescarResumen } = useSesion();
  const { datos: c, setDatos, error, cargando, recargar } = useCarga<DetalleCotizacion | null>(
    () =>
      valido
        ? api.cotizacion(numero).catch((e: unknown) => {
            if (e instanceof ErrorApi && e.status === 404) return null;
            throw e;
          })
        : Promise.resolve(null),
    [numero],
  );

  const [editando, setEditando] = useState(false);
  const [precios, setPrecios] = useState<Record<string, string>>({});
  const [intento, setIntento] = useState(false);
  const [avisar, setAvisar] = useState(true);
  const [ventana, setVentana] = useState<Ventana>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!c) return;
    setPrecios(Object.fromEntries(c.piezas.map((p) => [p.id, p.precioUnitario !== null ? precioATexto(centavos(p.precioUnitario)) : ''])));
  }, [c]);

  const totalVivo = useMemo(() => {
    if (!c) return 0;
    return c.piezas.reduce((s, p) => s + (leerPrecio(precios[p.id] ?? '') ?? 0) * p.cantidad, 0);
  }, [c, precios]);

  if (!c) {
    if (!cargando && !error) {
      return (
        <>
          <Link className="back" to="/cotizaciones">
            ← Volver a cotizaciones
          </Link>
          <div className="empty">No existe la cotización {valido ? numeroCT(numero) : params.numero}.</div>
        </>
      );
    }
    return <EstadoCarga cargando={cargando} error={error} reintentar={recargar} />;
  }

  const ct = numeroCT(c.numero);
  const fuera = c.cotizadaPor !== null && c.cotizadaPor !== 'sistema' ? c.cotizadaPor : null;
  const cotizadaSistema = c.estado === 'cotizada' && c.cotizadaPor === 'sistema';
  const edit = c.estado === 'en_revision' || (c.estado === 'cotizada' && editando);
  const { conPrecio } = textoTotal(c);
  const unidades = c.piezas.reduce((s, p) => s + p.cantidad, 0);

  const aplicar = (nueva: DetalleCotizacion) => {
    setDatos(nueva);
    setEditando(false);
    setIntento(false);
    refrescarResumen();
  };

  /** Corre una acción contra la API; devuelve el error a mostrar o null. Si otro asesor la cambió antes, recarga. */
  const ejecutar = async (accion: () => Promise<DetalleCotizacion>, exito: (n: DetalleCotizacion) => string): Promise<string | null> => {
    setOcupado(true);
    try {
      const nueva = await accion();
      aplicar(nueva);
      toast(exito(nueva));
      return null;
    } catch (e) {
      if (e instanceof ErrorApi && (e.status === 409 || e.status === 404)) recargar();
      return mensajeDe(e);
    } finally {
      setOcupado(false);
    }
  };

  const conToast = async (accion: () => Promise<DetalleCotizacion>, exito: (n: DetalleCotizacion) => string) => {
    const err = await ejecutar(accion, exito);
    if (err) toast(err);
  };

  const estado = (a: AccionEstado) => () => api.estado(c.numero, a);

  const enviar = () => {
    const todas = c.piezas.every((p) => leerPrecio(precios[p.id] ?? '') !== null);
    if (!todas) {
      setIntento(true);
      return;
    }
    const avisa = !cotizadaSistema || avisar;
    void conToast(
      () =>
        api.precios(c.numero, {
          precios: c.piezas.map((p) => {
            const v = leerPrecio(precios[p.id] ?? '');
            return { itemId: p.id, precioUnitario: v === null ? null : precioATexto(v) };
          }),
          enviar: true,
          avisar: avisa,
        }),
      (n) =>
        avisa
          ? `Cotización enviada. Le enviamos un correo al cliente con el total de ${n.total !== null ? lempiras(n.total) : lempirasDeCentavos(totalVivo)}.`
          : 'Precios guardados sin avisar al cliente.',
    );
  };

  let acciones: JSX.Element | null = null;
  if (c.estado === 'recibida') {
    acciones = (
      <button className="btn pri" type="button" disabled={ocupado} onClick={() => void conToast(estado({ accion: 'tomar' }), () => `Tomaste ${ct}. El cliente la ve En revisión.`)}>
        Tomar solicitud
      </button>
    );
  } else if (edit) {
    acciones = (
      <>
        <button className="btn pri" type="button" disabled={ocupado} onClick={enviar}>
          {cotizadaSistema ? 'Guardar precios' : 'Enviar cotización al cliente'}
        </button>
        {cotizadaSistema && (
          <label className="small check">
            <input type="checkbox" checked={avisar} onChange={(e) => setAvisar(e.target.checked)} /> Avisar al cliente del cambio
          </label>
        )}
        {c.estado === 'en_revision' && (
          <button className="btn" type="button" disabled={ocupado} onClick={() => setVentana('fuera')}>
            La envié por WhatsApp u otro medio
          </button>
        )}
      </>
    );
  } else if (c.estado === 'cotizada') {
    acciones = (
      <>
        <button
          className="btn"
          type="button"
          onClick={() => {
            setEditando(true);
            setAvisar(true);
          }}
        >
          {fuera ? 'Poner precios en el sistema' : 'Corregir precios'}
        </button>
        <button
          className="btn"
          type="button"
          disabled={ocupado}
          onClick={() => void conToast(estado({ accion: 'cambiar', a: 'confirmada', canal: 'whatsapp' }), () => `${ct} confirmada`)}
        >
          Marcar confirmada
        </button>
      </>
    );
  } else if (c.estado === 'confirmada') {
    acciones = (
      <button
        className="btn pri"
        type="button"
        disabled={ocupado}
        onClick={() =>
          void conToast(estado({ accion: 'cambiar', a: 'entregada', canal: c.entrega.modo === 'retiro' ? 'tienda' : 'whatsapp' }), () => `${ct} entregada`)
        }
      >
        Marcar entregada
      </button>
    );
  }

  const cancelable = c.estado === 'recibida' || c.estado === 'en_revision' || c.estado === 'cotizada';
  const pista: Record<Estado, string> = {
    recibida: 'Al tomarla quedas como responsable y el cliente la ve «En revisión».',
    en_revision:
      'Pon el precio unitario de cada pieza y envíala: al cliente le llega un correo con el total. Si ya se la mandaste por WhatsApp u otro medio, márcalo sin poner precios.',
    cotizada: fuera
      ? `Se la enviaste por ${ETIQUETA_CANAL[fuera]}. El cliente la ve «Cotizada» en su portal, sin precios. Si te confirmó por fuera, márcala confirmada.`
      : 'El cliente ya tiene los precios. Si te confirmó por WhatsApp, márcala confirmada.',
    confirmada: 'Coordina pago y entrega por WhatsApp. Cuando la entregues, márcala.',
    entregada: '',
    cancelada: `Motivo: ${c.motivoCancelacion ?? ''}`,
  };
  const wa = enlaceWhatsApp(c.contacto.telefono);
  const e = c.entrega;

  return (
    <>
      <Link className="back" to="/cotizaciones">
        ← Volver a cotizaciones
      </Link>
      <div className="head">
        <div>
          <h1 className="h1">Cotización {ct}</h1>
          <p className="sub">
            Solicitada el {fechaHora(c.creadaEn)} · {c.asesor ? `Atiende ${c.asesor.nombre}` : 'Sin asignar'}
          </p>
        </div>
        <Badge estado={c.estado} />
      </div>
      <div className="det">
        <div>
          <section className="box">
            <div className="box-h">
              <h2 className="h2">Piezas</h2>
              <span className="small">
                {c.piezas.length} repuestos · {unidades} und.
              </span>
            </div>
            {c.piezas.map((p) => {
              const v = leerPrecio(precios[p.id] ?? '');
              const malo = intento && v === null;
              return (
                <div className="item" key={p.id}>
                  <div>
                    <div className="strong">{p.nombre}</div>
                    <div className="part">N° {p.numeroParte}</div>
                  </div>
                  <div className="q r">
                    <span className="small">×</span> <b>{p.cantidad}</b>
                  </div>
                  <div className="p">
                    {edit ? (
                      <label className={`price${malo ? ' bad' : ''}`}>
                        <span>L</span>
                        <input
                          inputMode="decimal"
                          aria-label={`Precio unitario de ${p.nombre}`}
                          aria-invalid={malo || undefined}
                          placeholder="0.00"
                          maxLength={14}
                          value={precios[p.id] ?? ''}
                          onChange={(ev) => setPrecios((prev) => ({ ...prev, [p.id]: ev.target.value }))}
                        />
                      </label>
                    ) : (
                      <span className={`r ${p.precioUnitario ? '' : 'small'}`} style={{ display: 'block' }}>
                        {p.precioUnitario ? lempiras(p.precioUnitario) : 'Sin precio'}
                      </span>
                    )}
                  </div>
                  <div className="s r strong">
                    {edit ? (v !== null ? lempirasDeCentavos(v * p.cantidad) : '—') : p.precioUnitario ? lempirasDeCentavos(centavos(p.precioUnitario) * p.cantidad) : '—'}
                  </div>
                </div>
              );
            })}
            <div className="total">
              <span className="lbl">Total</span>
              <b>{edit ? lempirasDeCentavos(totalVivo) : conPrecio && c.total !== null ? lempiras(c.total) : '—'}</b>
            </div>
            {intento && edit && (
              <p className="note ko" role="alert" style={{ paddingTop: 12 }}>
                Falta el precio de alguna pieza. Todas necesitan precio para enviar la cotización.
              </p>
            )}
            <div className="actions">
              {acciones}
              <span className="derecha">
                <button className="btn link" type="button" onClick={() => setVentana('mover')}>
                  Cambiar estado…
                </button>
                {cancelable && (
                  <button className="btn link" type="button" onClick={() => setVentana('cancelar')}>
                    Cancelar solicitud
                  </button>
                )}
              </span>
            </div>
            {pista[c.estado] && <p className="note">{pista[c.estado]}</p>}
          </section>

          {c.notas && (
            <section className="box">
              <div className="box-h">
                <h2 className="h2">Notas del cliente</h2>
              </div>
              <div className="box-b" style={{ overflowWrap: 'anywhere', whiteSpace: 'pre-line' }}>
                {c.notas}
              </div>
            </section>
          )}

          <section className="box">
            <div className="box-h">
              <h2 className="h2">Bitácora</h2>
            </div>
            <div className="box-b">
              <ul className="log">
                {c.bitacora.map((l) => (
                  <li key={l.id}>
                    <span>
                      <b>{fechaCorta(l.creadoEn)}</b> · {textoCambio(l, c.contacto.nombre)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <div>
          <section className="box">
            <div className="box-h">
              <h2 className="h2">Cliente</h2>
              <Link className="btn link" to={`/clientes/${c.clienteId}`}>
                Ver historial
              </Link>
            </div>
            <div className="box-b">
              <dl className="kv">
                <dt>Nombre</dt>
                <dd>{c.contacto.nombre}</dd>
                {c.contacto.empresa && (
                  <>
                    <dt>Empresa</dt>
                    <dd>{c.contacto.empresa}</dd>
                  </>
                )}
                <dt>Teléfono</dt>
                <dd>{c.contacto.telefono}</dd>
                <dt>Correo</dt>
                <dd>{c.contacto.correo}</dd>
                {c.contacto.rtn && (
                  <>
                    <dt>RTN</dt>
                    <dd>{c.contacto.rtn}</dd>
                  </>
                )}
              </dl>
              {wa && (
                <div style={{ marginTop: 12 }}>
                  <a className="btn sm" href={wa} target="_blank" rel="noopener noreferrer">
                    Escribir por WhatsApp
                  </a>
                </div>
              )}
            </div>
          </section>

          <section className="box">
            <div className="box-h">
              <h2 className="h2">Entrega</h2>
            </div>
            <div className="box-b">
              <dl className="kv">
                {e.modo === 'retiro' ? (
                  <>
                    <dt>Modalidad</dt>
                    <dd>Retiro en tienda</dd>
                    <dt>Sucursal</dt>
                    <dd>{e.sucursal ?? 'No indicada'}</dd>
                  </>
                ) : (
                  <>
                    <dt>Modalidad</dt>
                    <dd>Envío a dirección</dd>
                    <dt>Lugar</dt>
                    <dd>{[e.ciudad, e.departamento].filter(Boolean).join(', ')}</dd>
                    <dt>Dirección</dt>
                    <dd>{e.direccion}</dd>
                    {e.referencia && (
                      <>
                        <dt>Referencia</dt>
                        <dd>{e.referencia}</dd>
                      </>
                    )}
                  </>
                )}
              </dl>
            </div>
          </section>

          <section className="box">
            <div className="box-h">
              <h2 className="h2">Vehículo</h2>
            </div>
            <div className="box-b">
              <dl className="kv">
                <dt>Marca/modelo</dt>
                <dd>{c.equipo || 'No indicado'}</dd>
                {c.serie && (
                  <>
                    <dt>N° de serie</dt>
                    <dd>{c.serie}</dd>
                  </>
                )}
              </dl>
              {c.conFoto && (
                <a href={api.urlFoto(c.numero)} target="_blank" rel="noopener noreferrer">
                  <img className="photo" src={api.urlFoto(c.numero)} alt="Foto del vehículo enviada por el cliente" loading="lazy" />
                </a>
              )}
            </div>
          </section>

          <section className="box">
            <div className="box-h">
              <h2 className="h2">Correos</h2>
            </div>
            <div className="box-b" style={{ display: 'grid', gap: 8 }}>
              {c.correos.length === 0 && <span className="small">Todavía no se envió ningún correo.</span>}
              {c.correos.map((m) => {
                const ok = m.estado === 'enviado';
                const enviando = m.estado === 'pendiente' && !m.motivo;
                return (
                  <div className="mail" key={m.id}>
                    <span className={ok ? 'ok' : enviando ? 'small' : 'ko'}>{ok ? 'Enviado' : enviando ? 'Enviando…' : 'No se envió'}</span>
                    <span>{ETIQUETA_CORREO[m.tipo]}</span>
                    {m.motivo && <span className="small">{m.motivo}</span>}
                    {m.sePuedeReenviar && (
                      <button
                        className="btn link"
                        style={{ marginLeft: 'auto' }}
                        type="button"
                        disabled={ocupado}
                        onClick={() => void conToast(() => api.reenviarAviso(c.numero, m.id), () => 'Correo reenviado')}
                      >
                        Reenviar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {ventana === 'fuera' && (
        <Dialogo
          titulo={`${ct} enviada por fuera`}
          textoEnviar="Marcar cotizada"
          alCerrar={() => setVentana(null)}
          alEnviar={async (f) => {
            const canal = campo(f, 'canal');
            if (!esCanalFuera(canal)) return 'Elige por dónde se la enviaste.';
            const nota = campo(f, 'nota');
            return ejecutar(estado({ accion: 'fuera', canal, ...(nota ? { nota } : {}) }), () => `${ct} cotizada por ${etiquetaCanalFuera(canal)}`);
          }}
        >
          <SelectorCanal />
          <label htmlFor="d-n">
            Nota (opcional)
            <textarea className="field" id="d-n" name="nota" maxLength={2000} placeholder="Ej. le mandé la cotización del sistema por WhatsApp" />
          </label>
          <p className="small" style={{ margin: 0 }}>
            Pasa a «Cotizada» sin precios en el sistema y no se le manda correo. Queda en la bitácora.
          </p>
        </Dialogo>
      )}

      {ventana === 'mover' && (
        <Dialogo
          titulo={`Cambiar estado de ${ct}`}
          textoEnviar="Cambiar estado"
          alCerrar={() => setVentana(null)}
          alEnviar={async (f) => {
            const a = campo(f, 'estado');
            const canal = campo(f, 'canal');
            if (!esEstadoMovible(a) || !esCanalFuera(canal)) return 'Elige el estado y por dónde.';
            const nota = campo(f, 'nota');
            return ejecutar(estado({ accion: 'cambiar', a, canal, ...(nota ? { nota } : {}) }), () => `${ct} pasó a ${ETIQUETA_ESTADO[a]}`);
          }}
        >
          <label htmlFor="d-e">
            Pasar a
            <select className="field" id="d-e" name="estado">
              {ORDEN_ESTADOS.filter((x) => x !== c.estado).map((x) => (
                <option key={x} value={x}>
                  {ETIQUETA_ESTADO[x]}
                </option>
              ))}
            </select>
          </label>
          <SelectorCanal />
          <label htmlFor="d-n">
            Nota (opcional)
            <textarea className="field" id="d-n" name="nota" maxLength={2000} placeholder="Ej. confirmó por teléfono, pasa a retirar mañana" />
          </label>
          <p className="small" style={{ margin: 0 }}>
            Sirve para lo que se resolvió fuera del sistema o para corregir un error, también hacia atrás. No se manda correo al cliente; el cambio queda en la
            bitácora.
          </p>
        </Dialogo>
      )}

      {ventana === 'cancelar' && (
        <Dialogo
          titulo={`Cancelar ${ct}`}
          textoEnviar="Cancelar solicitud"
          alCerrar={() => setVentana(null)}
          alEnviar={async (f) => {
            const elegido = campo(f, 'motivo');
            const detalle = campo(f, 'detalle');
            if (!elegido) return 'Elige el motivo.';
            if (elegido === 'Otro' && !detalle) return 'Escribe el motivo en el detalle: es lo que verá el cliente.';
            const motivo = elegido === 'Otro' ? detalle : elegido;
            const nota = elegido !== 'Otro' && detalle ? `${motivo} · ${detalle}` : undefined;
            return ejecutar(estado({ accion: 'cancelar', motivo, ...(nota ? { nota } : {}) }), () => `${ct} cancelada`);
          }}
        >
          <label htmlFor="d-m">
            Motivo (lo verá el cliente)
            <select className="field" id="d-m" name="motivo">
              {MOTIVOS_CANCELACION.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label htmlFor="d-n">
            Detalle (opcional)
            <textarea className="field" id="d-n" name="detalle" maxLength={2000} />
          </label>
          <p className="small" style={{ margin: 0 }}>
            El detalle queda solo en la bitácora; si eliges «Otro», el detalle es el motivo que verá el cliente.
          </p>
        </Dialogo>
      )}
    </>
  );
}
