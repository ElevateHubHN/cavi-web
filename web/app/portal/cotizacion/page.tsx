"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { PortalShell } from "@/components/portal-shell";
import { company } from "@/lib/company";
import {
  ArrowLeftIcon,
  CheckIcon,
  FileTextIcon,
  StoreIcon,
  TruckIcon,
  WhatsAppIcon,
} from "@/components/icons";
import {
  acceptQuote,
  cancelQuote,
  CANCELLABLE_STATUSES,
  countUnits,
  errorMessage,
  formatLempiras,
  formatQuoteDate,
  getQuote,
  pricesChanged,
  QUOTE_CHANNEL_TEXT,
  QUOTE_STATUS_META,
  QUOTE_STATUS_ORDER,
  type Quote,
} from "@/lib/portal";

/**
 * El id va por query param (?id=CT-1042) y no como ruta dinámica: con
 * `output: "export"` no se pueden pregenerar rutas para ids creados en el servidor.
 */
export default function QuoteDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="shell py-20">
          <div className="mx-auto h-[220px] max-w-[720px] animate-pulse rounded-[14px] border-[1.5px] border-line bg-soft" />
        </div>
      }
    >
      <PortalShell subtitle="Detalle y seguimiento de tu solicitud.">
        <QuoteDetail />
      </PortalShell>
    </Suspense>
  );
}

type Notice = "nueva" | "aceptada" | "cancelada" | null;

function statusHint(quote: Quote): string {
  if (quote.status === "cancelada") {
    return quote.cancelReason
      ? `Esta solicitud se canceló. Motivo: ${quote.cancelReason}`
      : QUOTE_STATUS_META.cancelada.hint;
  }
  if (quote.status === "cotizada" && quote.quotedVia) {
    return `Tu asesor te envió la cotización ${QUOTE_CHANNEL_TEXT[quote.quotedVia]}. Revísala ahí y, si estás de acuerdo, acéptala aquí o respóndele por ese medio.`;
  }
  return QUOTE_STATUS_META[quote.status].hint;
}

function QuoteDetail() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const isNew = params.get("nueva") === "1";
  // undefined = cargando; null = no existe.
  const [quote, setQuote] = useState<Quote | null | undefined>(undefined);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const load = useCallback(() => {
    setLoadError("");
    setQuote(undefined);
    getQuote(id)
      .then(setQuote)
      .catch((failure) => setLoadError(errorMessage(failure)));
  }, [id]);

  useEffect(() => {
    load();
    setNotice(isNew ? "nueva" : null);
    setActionError("");
  }, [load, isNew]);

  if (loadError) {
    return (
      <div className="rounded-[14px] border-[1.5px] border-line bg-soft px-5 py-[50px] text-center">
        <div className="font-display text-xl font-bold text-navy">
          No pudimos cargar la cotización
        </div>
        <p className="mb-5 mt-2 text-muted">{loadError}</p>
        <button
          type="button"
          onClick={load}
          className="inline-flex h-11 items-center rounded-[9px] bg-red px-6 text-sm font-bold text-white transition-colors hover:bg-red-dark"
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }

  if (quote === undefined) {
    return <div className="h-[300px] animate-pulse rounded-[14px] border-[1.5px] border-line bg-soft" />;
  }

  if (quote === null) {
    return (
      <div className="rounded-[14px] border-[1.5px] border-dashed border-[#CBD5E3] bg-soft px-5 py-[60px] text-center">
        <div className="inline-grid h-[62px] w-[62px] place-items-center rounded-[14px] border-[1.5px] border-line bg-white text-[#9DAECB]">
          <FileTextIcon size={27} strokeWidth={1.8} />
        </div>
        <div className="mt-4 font-display text-xl font-bold text-navy">
          Cotización no encontrada
        </div>
        <p className="mb-5 mt-2 text-muted">
          {id ? (
            <>
              No encontramos la cotización{" "}
              <b className="font-semibold text-navy">{id}</b> en tu historial.
            </>
          ) : (
            "No indicaste qué cotización quieres ver."
          )}
        </p>
        <Link
          href="/portal"
          className="inline-flex h-12 items-center rounded-[9px] bg-red px-[26px] text-[15px] font-bold text-white transition-colors hover:bg-red-dark"
        >
          Ver mis cotizaciones
        </Link>
      </div>
    );
  }

  const current = quote;
  const meta = QUOTE_STATUS_META[current.status];
  const showPrices = typeof current.total === "number";
  const canCancel = CANCELLABLE_STATUSES.includes(current.status);
  const rowCols = showPrices
    ? "sm:grid-cols-[1fr_64px_118px_118px]"
    : "sm:grid-cols-[1fr_64px_150px]";

  const waMessage = encodeURIComponent(
    `Hola CAVI, quiero consultar sobre mi cotización ${current.id}.`
  );

  async function act(task: () => Promise<Quote>, done: Notice) {
    setBusy(true);
    setActionError("");
    try {
      setQuote(await task());
      setNotice(done);
      return true;
    } catch (failure) {
      if (pricesChanged(failure)) {
        setActionError("Los precios se actualizaron, revísalos antes de aceptar.");
        getQuote(current.id)
          .then((fresh) => fresh && setQuote(fresh))
          .catch(() => undefined);
      } else {
        setActionError(errorMessage(failure));
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link
        href="/portal"
        className="inline-flex items-center gap-[7px] text-[13.5px] font-bold text-muted transition-colors hover:text-navy"
      >
        <ArrowLeftIcon size={15} />
        Volver a mis cotizaciones
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[26px] font-extrabold tracking-[-0.02em] text-navy">
            Cotización {current.id}
          </h2>
          <div className="mt-1 text-[14px] text-muted">
            Solicitada el {formatQuoteDate(current.createdAt)} ·{" "}
            {current.items.length}{" "}
            {current.items.length === 1 ? "repuesto" : "repuestos"} ·{" "}
            {countUnits(current)} und.
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-[12px] py-[5px] text-[12.5px] font-bold ${meta.badge}`}
        >
          {meta.label}
        </span>
      </div>

      {notice && (
        <div className="mt-4 flex items-start gap-[10px] rounded-[10px] border border-green/25 bg-green/5 px-[14px] py-3 text-[13.5px] leading-[1.5] text-ink-2">
          <span className="mt-[1px] text-green">
            <CheckIcon size={17} />
          </span>
          <span>
            {notice === "nueva" && (
              <>
                <b className="font-bold text-navy">Tu solicitud ya está en tu portal.</b>{" "}
                Te avisaremos por correo cuando tenga precios.
              </>
            )}
            {notice === "aceptada" && (
              <>
                <b className="font-bold text-navy">¡Cotización aceptada!</b> Un
                asesor de CAVI te contactará para coordinar el pago y la entrega.
              </>
            )}
            {notice === "cancelada" && (
              <>
                <b className="font-bold text-navy">Cotización cancelada.</b> Le
                avisamos a CAVI.
              </>
            )}
          </span>
        </div>
      )}

      <div className="mt-5 rounded-[14px] border-[1.5px] border-line bg-white p-5">
        <div className="mb-[18px] text-[12px] font-bold uppercase tracking-[0.06em] text-[#8494AB]">
          Seguimiento
        </div>
        {current.status !== "cancelada" && <Timeline status={current.status} />}
        <p
          className={`rounded-[10px] border border-line bg-soft px-[14px] py-3 text-[13px] leading-[1.5] text-muted ${
            current.status === "cancelada" ? "" : "mt-[18px]"
          }`}
        >
          {statusHint(current)}
        </p>
      </div>

      <div className="mt-5 overflow-hidden rounded-[14px] border-[1.5px] border-line">
        <div
          className={`hidden gap-3 bg-soft px-5 py-[13px] text-[12px] font-bold uppercase tracking-[0.06em] text-[#8494AB] sm:grid ${rowCols}`}
        >
          <span>Repuesto</span>
          <span className="text-center">Cant.</span>
          {showPrices ? (
            <>
              <span className="text-right">P. unitario</span>
              <span className="text-right">Subtotal</span>
            </>
          ) : (
            <span className="text-right">Precio</span>
          )}
        </div>

        {current.items.map((item, index) => (
          <div
            key={`${item.productId}-${item.part}-${index}`}
            className={`grid grid-cols-1 gap-1 border-t border-[#EDF1F6] px-5 py-[14px] sm:items-center sm:gap-3 ${rowCols}`}
          >
            <div className="min-w-0">
              <Link
                href={`/producto/${item.productId}`}
                className="block font-display text-[15px] font-bold text-navy hover:text-red"
              >
                {item.name}
              </Link>
              <div className="font-mono text-[12px] text-muted">
                N° {item.part}
              </div>
            </div>
            <div className="text-[14px] text-ink-2 sm:text-center">
              <span className="text-muted sm:hidden">Cantidad: </span>
              {item.qty}
            </div>
            {showPrices ? (
              <>
                <div className="text-[14px] text-ink-2 sm:text-right">
                  <span className="text-muted sm:hidden">Unitario: </span>
                  {item.unitPrice ? formatLempiras(item.unitPrice) : "—"}
                </div>
                <div className="font-display text-[14.5px] font-bold text-navy sm:text-right">
                  <span className="font-sans font-normal text-muted sm:hidden">
                    Subtotal:{" "}
                  </span>
                  {item.unitPrice ? formatLempiras(item.unitPrice * item.qty) : "—"}
                </div>
              </>
            ) : (
              <div className="text-[13.5px] text-muted-2 sm:text-right">
                {current.quotedVia || current.status === "cancelada" ? "—" : "Pendiente de cotizar"}
              </div>
            )}
          </div>
        ))}

        {showPrices ? (
          <div className="flex items-center justify-between border-t border-line bg-soft px-5 py-[14px]">
            <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#8494AB]">
              Total
            </span>
            <span className="font-display text-[20px] font-extrabold text-navy">
              {formatLempiras(current.total ?? 0)}
            </span>
          </div>
        ) : current.quotedVia ? (
          <div className="border-t border-line bg-soft px-5 py-[13px] text-[13px] text-muted">
            Los precios están en la cotización que te envió tu asesor{" "}
            {QUOTE_CHANNEL_TEXT[current.quotedVia]}.
          </div>
        ) : (
          <div className="border-t border-line bg-soft px-5 py-[13px] text-[13px] text-muted">
            El precio se confirma por cotización según marca, disponibilidad y
            tiempo de entrega.
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-[14px] border-[1.5px] border-line bg-white p-5">
          <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.06em] text-[#8494AB]">
            Entrega
          </div>
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-soft text-navy">
              {current.delivery.mode === "envio" ? (
                <TruckIcon size={19} />
              ) : (
                <StoreIcon size={19} />
              )}
            </span>
            <div className="text-[14px] leading-[1.55]">
              <div className="font-display font-bold text-navy">
                {current.delivery.mode === "envio"
                  ? "Envío a dirección"
                  : "Retiro en tienda"}
              </div>
              {current.delivery.mode === "envio" ? (
                <>
                  <div className="text-muted">
                    {current.delivery.address || "Dirección por confirmar"}
                  </div>
                  {(current.delivery.city || current.delivery.department) && (
                    <div className="text-muted">
                      {[current.delivery.city, current.delivery.department]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                  {current.delivery.reference && (
                    <div className="mt-[6px] text-[13.5px] text-muted">
                      <span className="font-semibold text-ink-2">
                        Referencia:
                      </span>{" "}
                      {current.delivery.reference}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted">
                  {current.delivery.branch || "Sucursal por confirmar"}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[14px] border-[1.5px] border-line bg-white p-5">
          <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.06em] text-[#8494AB]">
            Equipo y notas
          </div>
          <dl className="flex flex-col gap-[10px] text-[14px]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Marca / modelo</dt>
              <dd className="text-right font-semibold text-navy">
                {current.equipment || "No indicado"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">N° de serie</dt>
              <dd className="text-right font-mono text-[13px] text-navy">
                {current.serial || "—"}
              </dd>
            </div>
            {current.hasPhoto && (
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-muted">Foto del vehículo</dt>
                <dd className="min-w-0 break-words text-right text-[13.5px] font-semibold text-navy">
                  Enviada a tu asesor
                </dd>
              </div>
            )}
            <div>
              <dt className="text-muted">Notas</dt>
              <dd className="mt-1 leading-[1.5] text-ink-2">
                {current.notes || "Sin notas para el asesor."}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {actionError && !confirmingCancel && (
        <p
          role="alert"
          className="mt-5 rounded-[10px] border border-red/25 bg-red/5 px-[14px] py-[10px] text-[13px] font-semibold leading-[1.45] text-red"
        >
          {actionError}
        </p>
      )}
      <div className="mt-5 flex flex-col gap-3 rounded-[14px] border-[1.5px] border-line bg-soft p-5 sm:flex-row sm:flex-wrap sm:items-center">
        {current.status === "cotizada" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act(() => acceptQuote(current), "aceptada")}
            className="flex h-[50px] items-center justify-center gap-[9px] rounded-[10px] bg-red px-7 text-[15px] font-bold text-white transition-colors hover:bg-red-dark disabled:opacity-60"
          >
            <CheckIcon size={18} />
            Aceptar cotización
          </button>
        )}
        <a
          href={`${company.whatsapp[0].href}?text=${waMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-[50px] items-center justify-center gap-[9px] rounded-[10px] border-[1.5px] border-line-2 bg-white px-6 text-[14.5px] font-bold text-navy transition-colors hover:border-navy"
        >
          <WhatsAppIcon size={18} className="text-green" />
          Consultar por WhatsApp
        </a>
        <p className="text-[13px] leading-[1.5] text-muted sm:ml-auto sm:max-w-[220px] sm:text-right">
          {current.status === "cotizada"
            ? "Al aceptar, reservamos las piezas y te contactamos para el pago."
            : "¿Dudas con esta solicitud? Escríbenos y te ayudamos."}
        </p>
        {canCancel && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setActionError("");
              setConfirmingCancel(true);
            }}
            className="text-[13.5px] font-semibold text-muted underline-offset-2 hover:text-red hover:underline disabled:opacity-60 sm:w-full sm:text-right"
          >
            Ya no la necesito
          </button>
        )}
      </div>

      {confirmingCancel && (
        <CancelDialog
          quoteId={current.id}
          busy={busy}
          error={actionError}
          onClose={() => {
            setActionError("");
            setConfirmingCancel(false);
          }}
          onConfirm={async (comment) => {
            const ok = await act(() => cancelQuote(current.id, comment), "cancelada");
            if (ok) setConfirmingCancel(false);
          }}
        />
      )}
    </div>
  );
}

function CancelDialog({
  quoteId,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  quoteId: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (comment: string) => Promise<void>;
}) {
  const [comment, setComment] = useState("");
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fieldRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-navy/40 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-title"
        onSubmit={(e) => {
          e.preventDefault();
          void onConfirm(comment);
        }}
        className="w-full max-w-[460px] overflow-hidden rounded-[14px] border-[1.5px] border-line bg-white shadow-[0_18px_40px_rgba(11,37,69,0.18)]"
      >
        <div className="border-b border-line bg-soft px-6 py-4">
          <h3 id="cancel-title" className="font-display text-[18px] font-bold text-navy">
            ¿Cancelar la cotización {quoteId}?
          </h3>
        </div>
        <div className="px-6 py-5">
          <label className="block">
            <span className="text-[13px] font-semibold text-muted">
              ¿Por qué? (opcional, nos ayuda a mejorar)
            </span>
            <textarea
              ref={fieldRef}
              value={comment}
              maxLength={2000}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ej. ya lo conseguí, cambié de vehículo…"
              className="mt-[6px] h-24 w-full resize-y rounded-[9px] border-[1.5px] border-line-2 px-[13px] py-[11px] text-[14.5px] outline-none focus:border-navy"
            />
          </label>
          <p className="mt-3 text-[13px] leading-[1.5] text-muted">
            Le avisamos a CAVI. Si cambias de opinión, escríbenos por WhatsApp y
            la reactivamos.
          </p>
          {error && (
            <p
              role="alert"
              className="mt-3 rounded-[10px] border border-red/25 bg-red/5 px-[14px] py-[10px] text-[13px] font-semibold leading-[1.45] text-red"
            >
              {error}
            </p>
          )}
        </div>
        <div className="flex flex-col-reverse gap-[10px] border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 items-center justify-center rounded-[9px] border-[1.5px] border-line-2 bg-white px-5 text-sm font-bold text-navy transition-colors hover:border-navy"
          >
            Volver
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex h-11 items-center justify-center rounded-[9px] bg-red px-5 text-sm font-bold text-white transition-colors hover:bg-red-dark disabled:opacity-60"
          >
            Sí, ya no la necesito
          </button>
        </div>
      </form>
    </div>
  );
}

/** Recibida → En revisión → Cotizada → Confirmada → Entregada. */
function Timeline({ status }: { status: Quote["status"] }) {
  const current = QUOTE_STATUS_ORDER.indexOf(status);

  return (
    <ol className="flex flex-col md:flex-row md:items-start">
      {QUOTE_STATUS_ORDER.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={step}
            className="relative flex flex-1 items-start gap-3 pb-[22px] last:pb-0 md:flex-col md:items-center md:gap-[10px] md:pb-0 md:text-center"
          >
            {i < QUOTE_STATUS_ORDER.length - 1 && (
              <span
                aria-hidden
                className={`absolute left-[15px] top-[34px] h-[calc(100%-34px)] w-[2px] md:left-1/2 md:top-[15px] md:h-[2px] md:w-full ${
                  done ? "bg-navy" : "bg-line"
                }`}
              />
            )}
            <span
              className={`relative z-[1] grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-[12px] font-extrabold ${
                done
                  ? "border-navy bg-navy text-white"
                  : active
                    ? "border-red bg-red text-white ring-4 ring-red/15"
                    : "border-line bg-white text-muted-3"
              }`}
            >
              {done ? <CheckIcon size={15} /> : i + 1}
            </span>
            <span
              className={`pt-[6px] text-[13px] leading-[1.3] md:pt-0 ${
                active
                  ? "font-bold text-navy"
                  : done
                    ? "font-semibold text-ink-2"
                    : "text-muted-3"
              }`}
            >
              {QUOTE_STATUS_META[step].label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
