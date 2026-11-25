"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { offerCategories, resolveOffers } from "@/lib/offers";
import { ArrowRightIcon } from "./icons";
import { OfferCard } from "./offer-card";

const ALL = "Todas";

function OfferChips({
  categories,
  active,
  onSelect,
}: {
  categories: string[];
  active: string;
  onSelect: (c: string) => void;
}) {
  return (
    <div role="group" aria-label="Filtrar ofertas por categoría" className="flex flex-wrap gap-2">
      {[ALL, ...categories].map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={active === c}
          onClick={() => onSelect(c)}
          className={`h-[36px] rounded-full px-[15px] text-[13px] font-bold transition-colors ${
            active === c
              ? "border border-white bg-white text-navy"
              : "border border-white/20 bg-white/[0.06] text-on-navy hover:border-white/40 hover:text-white"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

function EmptyOffers() {
  return (
    <div className="rounded-[16px] bg-white px-6 py-14 text-center">
      <h2 className="font-display text-[24px] font-extrabold tracking-[-0.01em] text-navy">
        Pronto publicaremos ofertas
      </h2>
      <p className="mx-auto mt-3 max-w-[520px] text-[15px] leading-[1.55] text-muted">
        Mientras tanto, explora el catálogo o pídenos una cotización.
      </p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/catalogo"
          className="flex h-[44px] items-center justify-center gap-[7px] rounded-lg bg-navy px-[20px] text-sm font-bold text-white transition-colors hover:bg-navy-dark"
        >
          Ver catálogo
        </Link>
        <Link
          href="/cotizacion"
          className="flex h-[44px] items-center justify-center gap-[7px] rounded-lg bg-red px-[20px] text-sm font-bold text-white transition-colors hover:bg-red-dark"
        >
          Pedir cotización <ArrowRightIcon size={16} />
        </Link>
      </div>
    </div>
  );
}

export function OffersSection() {
  const all = useMemo(() => resolveOffers(), []);
  const categories = useMemo(() => offerCategories(all), [all]);
  const [active, setActive] = useState(ALL);
  const visible = useMemo(
    () => (active === ALL ? all : all.filter((o) => o.product.cat === active)),
    [all, active]
  );

  return (
    <section className="bg-navy text-white">
      <div className="shell py-14">
        <div className="mb-[14px] text-[13px] text-on-navy">
          <Link href="/" className="hover:text-white">
            Inicio
          </Link>{" "}
          <span className="text-white/30">/</span>{" "}
          <span className="font-semibold text-white">Ofertas</span>
        </div>
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="flex items-center gap-3 font-display text-[30px] font-extrabold tracking-[-0.02em] sm:text-[34px]">
              <span aria-hidden="true" className="h-[30px] w-[7px] -skew-x-12 rounded-[2px] bg-red" />
              OFERTAS CAVI
            </h1>
            <p className="mt-2 text-[15.5px] text-on-navy">
              Repuestos seleccionados con descuento especial.
            </p>
          </div>
          {all.length > 0 && (
            <OfferChips categories={categories} active={active} onSelect={setActive} />
          )}
        </div>

        {all.length === 0 ? (
          <EmptyOffers />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {visible.map((o) => (
              <OfferCard key={o.product.id} offer={o} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
