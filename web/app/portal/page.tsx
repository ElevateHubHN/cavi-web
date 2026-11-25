"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PortalShell } from "@/components/portal-shell";
import { useCart } from "@/components/cart-context";
import { ArrowRightIcon, FileTextIcon, PlusIcon } from "@/components/icons";
import {
  countUnits,
  errorMessage,
  formatLempiras,
  formatQuoteDate,
  getQuotes,
  QUOTE_CHANNEL_TEXT,
  QUOTE_STATUS_META,
  type Quote,
} from "@/lib/portal";

export default function PortalPage() {
  return (
    <PortalShell subtitle="Este es el historial de las cotizaciones que has solicitado a CAVI.">
      <QuotesList />
    </PortalShell>
  );
}

function priceSummary(quote: Quote): { label?: string; value: string } | null {
  if (typeof quote.total === "number") return { label: "Total", value: formatLempiras(quote.total) };
  if (quote.status === "cancelada") return null;
  if (quote.quotedVia) return { value: `Precios enviados ${QUOTE_CHANNEL_TEXT[quote.quotedVia]}` };
  if (quote.status === "recibida" || quote.status === "en_revision") {
    return { value: "Pendiente de cotizar" };
  }
  return null;
}

function QuotesList() {
  const { count } = useCart();
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    getQuotes()
      .then(setQuotes)
      .catch((failure) => setError(errorMessage(failure)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Con piezas en la lista va directo al formulario; si no, a elegirlas en el catálogo.
  const newQuoteHref = count > 0 ? "/cotizacion" : "/catalogo";

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-baseline gap-3">
        <h2 className="font-display text-[19px] font-bold text-navy">
          Mis cotizaciones
        </h2>
        {quotes && quotes.length > 0 && (
          <span className="text-[13px] text-muted">
            {quotes.length} {quotes.length === 1 ? "solicitud" : "solicitudes"}
          </span>
        )}
      </div>
      <Link
        href={newQuoteHref}
        className="inline-flex h-10 items-center gap-2 rounded-[9px] bg-red px-[16px] text-[13.5px] font-bold text-white transition-colors hover:bg-red-dark"
      >
        <PlusIcon size={15} />
        Pedir otra cotización
      </Link>
    </div>
  );

  if (error) {
    return (
      <div className="flex flex-col gap-[14px]">
        {header}
        <div className="rounded-[14px] border-[1.5px] border-line bg-soft px-5 py-[40px] text-center">
          <div className="font-display text-lg font-bold text-navy">
            No pudimos cargar tus cotizaciones
          </div>
          <p className="mb-5 mt-2 text-muted">{error}</p>
          <button
            type="button"
            onClick={load}
            className="inline-flex h-11 items-center rounded-[9px] bg-red px-6 text-sm font-bold text-white transition-colors hover:bg-red-dark"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  if (quotes === null) {
    return <div className="h-[180px] animate-pulse rounded-[14px] border-[1.5px] border-line bg-soft" />;
  }

  if (quotes.length === 0) {
    return (
      <div className="rounded-[14px] border-[1.5px] border-dashed border-[#CBD5E3] bg-soft px-5 py-[60px] text-center">
        <div className="inline-grid h-[62px] w-[62px] place-items-center rounded-[14px] border-[1.5px] border-line bg-white text-[#9DAECB]">
          <FileTextIcon size={27} strokeWidth={1.8} />
        </div>
        <div className="mt-4 font-display text-xl font-bold text-navy">
          Aún no tienes cotizaciones
        </div>
        <p className="mb-5 mt-2 text-muted">
          Arma tu solicitud desde el catálogo y aquí verás el seguimiento.
        </p>
        <Link
          href="/catalogo"
          className="inline-flex h-12 items-center rounded-[9px] bg-red px-[26px] text-[15px] font-bold text-white transition-colors hover:bg-red-dark"
        >
          Explorar catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[14px]">
      {header}

      {quotes.map((quote) => {
        const meta = QUOTE_STATUS_META[quote.status];
        const price = priceSummary(quote);
        return (
          <article
            key={quote.id}
            className="rounded-[14px] border-[1.5px] border-line bg-white p-5 transition-colors hover:border-line-2"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-[10px]">
                  <span className="font-display text-[18px] font-extrabold tracking-[-0.01em] text-navy">
                    {quote.id}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-[10px] py-[3px] text-[11.5px] font-bold ${meta.badge}`}
                  >
                    {meta.label}
                  </span>
                </div>
                <div className="mt-[6px] text-[13.5px] text-muted">
                  {formatQuoteDate(quote.createdAt)} ·{" "}
                  {quote.items.length}{" "}
                  {quote.items.length === 1 ? "repuesto" : "repuestos"} ·{" "}
                  {countUnits(quote)} und.
                  {quote.status === "cancelada" && quote.cancelReason && (
                    <> · {quote.cancelReason}</>
                  )}
                </div>
              </div>

              {price && (
                <div className="text-right">
                  {price.label ? (
                    <>
                      <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-2">
                        {price.label}
                      </div>
                      <div className="font-display text-[19px] font-extrabold text-navy">
                        {price.value}
                      </div>
                    </>
                  ) : (
                    <div className="text-[13px] text-muted-2">{price.value}</div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-[14px] flex flex-wrap items-center justify-between gap-3 border-t border-[#EDF1F6] pt-[14px]">
              <p className="min-w-0 flex-1 truncate text-[13.5px] text-muted">
                {quote.items.map((i) => i.name).join(" · ")}
              </p>
              <Link
                href={`/portal/cotizacion?id=${encodeURIComponent(quote.id)}`}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[9px] border-[1.5px] border-line-2 bg-white px-[16px] text-[13.5px] font-bold text-navy transition-colors hover:border-navy"
              >
                Ver detalle
                <ArrowRightIcon size={15} />
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
