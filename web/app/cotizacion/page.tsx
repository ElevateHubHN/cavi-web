"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart-context";
import { getProduct } from "@/lib/products";
import { BrandLogo } from "@/components/brand-logo";
import { ProductImage } from "@/components/product-image";
import { QuoteForm, type QuoteSubmitResult } from "@/components/quote-form";
import {
  CartIcon,
  TrashIcon,
  ShieldCheckIcon,
  MailIcon,
  ArrowRightIcon,
} from "@/components/icons";

export default function CartPage() {
  const { items, count, lines, inc, dec, remove, clear } = useCart();
  const [result, setResult] = useState<QuoteSubmitResult | null>(null);

  const detailed = items
    .map((line) => {
      const product = getProduct(line.id);
      return product ? { ...product, qty: line.qty } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  function onSubmitted(submitted: QuoteSubmitResult) {
    setResult(submitted);
    clear();
    window.scrollTo(0, 0);
  }

  if (result?.signedIn) {
    return (
      <div className="shell max-w-[720px] py-16">
        <div className="text-center">
          <div className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-2xl bg-green/10 text-green">
            <ShieldCheckIcon size={34} />
          </div>
          <h1 className="mt-6 font-display text-[32px] font-extrabold tracking-[-0.02em] text-navy">
            ¡Solicitud enviada!
          </h1>
          <p className="mx-auto mt-3 max-w-[520px] text-[15.5px] text-muted">
            Quedó registrada como{" "}
            <b className="font-bold text-navy">{result.quoteId}</b> y ya está en
            tu portal. Un asesor de CAVI revisará las piezas y te avisaremos por
            correo cuando tenga precio y disponibilidad.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-[10px]">
            <Link
              href={`/portal/cotizacion?id=${encodeURIComponent(result.quoteId)}&nueva=1`}
              className="inline-flex h-[50px] items-center justify-center gap-[9px] rounded-[10px] bg-red px-7 text-[15px] font-bold text-white transition-colors hover:bg-red-dark"
            >
              Ver mi cotización
              <ArrowRightIcon size={17} />
            </Link>
            <Link
              href="/portal"
              className="inline-flex h-[50px] items-center justify-center rounded-[10px] border-[1.5px] border-line-2 bg-white px-7 text-[15px] font-bold text-navy transition-colors hover:border-navy"
            >
              Ir a mi portal
            </Link>
          </div>
        </div>

        <div className="mt-9 text-center">
          <Link
            href="/catalogo"
            className="text-[14.5px] font-bold text-navy underline-offset-4 transition-colors hover:text-red hover:underline"
          >
            Seguir explorando el catálogo
          </Link>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="shell max-w-[720px] py-16">
        <div className="text-center">
          <div className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-2xl bg-green/10 text-green">
            <ShieldCheckIcon size={34} />
          </div>
          <h1 className="mt-6 font-display text-[32px] font-extrabold tracking-[-0.02em] text-navy">
            ¡Solicitud enviada!
          </h1>
          <p className="mx-auto mt-3 max-w-[500px] text-[15.5px] text-muted">
            Gracias por tu solicitud de cotización. Quedó registrada como{" "}
            <b className="font-bold text-navy">{result.quoteId}</b>. Un asesor de
            CAVI revisará las piezas y te contactará con precio y disponibilidad.
          </p>
        </div>

        <div className="mt-9 overflow-hidden rounded-[14px] border-[1.5px] border-line">
          <div className="flex items-center gap-3 border-b border-line bg-soft px-5 py-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-navy text-white">
              <MailIcon size={20} />
            </span>
            <div className="font-display text-[17px] font-bold text-navy">
              Revisa tu correo
            </div>
          </div>

          <div className="px-5 py-5">
            <p className="text-[15px] leading-[1.6] text-ink-2">
              Te enviamos un correo a{" "}
              <b className="font-bold text-navy">{result.email}</b> para seguir
              tu cotización <b className="font-bold text-navy">{result.quoteId}</b>.
              Revisa tu bandeja (y la carpeta de spam).
            </p>
            <Link
              href="/portal"
              className="mt-5 inline-flex h-[50px] items-center justify-center gap-[9px] rounded-[10px] bg-red px-7 text-[15px] font-bold text-white transition-colors hover:bg-red-dark"
            >
              Ingresar a mi portal
              <ArrowRightIcon size={17} />
            </Link>
          </div>
        </div>

        <div className="mt-7 text-center">
          <Link
            href="/catalogo"
            className="text-[14.5px] font-bold text-navy underline-offset-4 transition-colors hover:text-red hover:underline"
          >
            Seguir explorando el catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shell pb-16 pt-[30px]">
      <h1 className="mb-1 font-display text-[34px] font-extrabold tracking-[-0.02em] text-navy">
        Mi solicitud de cotización
      </h1>
      <p className="mb-[26px] text-[15.5px] text-muted">
        Revisa las piezas y cantidades, completa los 3 pasos del formulario y te
        enviamos precios y disponibilidad.
      </p>

      {detailed.length === 0 ? (
        <div className="rounded-2xl border-[1.5px] border-dashed border-[#CBD5E3] bg-soft px-5 py-[70px] text-center">
          <div className="inline-grid h-[66px] w-[66px] place-items-center rounded-[14px] border-[1.5px] border-line bg-white text-[#9DAECB]">
            <CartIcon size={30} strokeWidth={1.8} />
          </div>
          <div className="mt-4 font-display text-xl font-bold text-navy">
            Tu solicitud está vacía
          </div>
          <p className="mb-5 mt-2 text-muted">
            Agrega repuestos desde el catálogo para pedir tu cotización.
          </p>
          <Link
            href="/catalogo"
            className="inline-flex h-12 items-center rounded-[9px] bg-red px-[26px] text-[15px] font-bold text-white transition-colors hover:bg-red-dark"
          >
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[1fr_400px]">
          <div>
            <div className="overflow-hidden rounded-[14px] border-[1.5px] border-line">
              <div className="grid grid-cols-[1fr_130px_44px] gap-3 bg-soft px-5 py-[13px] text-[12px] font-bold uppercase tracking-[0.06em] text-[#8494AB]">
                <span>Repuesto</span>
                <span className="text-center">Cantidad</span>
                <span />
              </div>
              {detailed.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_130px_44px] items-center gap-3 border-t border-[#EDF1F6] px-5 py-4"
                >
                  <div className="flex items-center gap-[14px]">
                    <Link
                      href={`/producto/${item.id}`}
                      className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-[10px] bg-gradient-to-br from-soft-2 to-[#E4E9F1]"
                    >
                      <ProductImage product={item} sizes="64px" />
                    </Link>
                    <div>
                      <Link
                        href={`/producto/${item.id}`}
                        className="block font-display text-base font-bold text-navy hover:text-red"
                      >
                        {item.name}
                      </Link>
                      <BrandLogo
                        name={item.brand}
                        className="mt-1 h-[14px] w-[60px] justify-start text-[10px]"
                        imgClassName="object-left"
                      />
                      <div className="mt-[3px] font-mono text-[12px] text-muted">
                        N° {item.part}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-self-center overflow-hidden rounded-lg border-[1.5px] border-line-2">
                    <button
                      type="button"
                      aria-label="Disminuir"
                      onClick={() => dec(item.id)}
                      className="h-10 w-[34px] border-0 bg-white text-[18px] text-navy transition-colors hover:bg-soft-2"
                    >
                      −
                    </button>
                    <span className="w-[34px] text-center font-display font-bold text-navy">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      aria-label="Aumentar"
                      onClick={() => inc(item.id)}
                      className="h-10 w-[34px] border-0 bg-white text-[18px] text-navy transition-colors hover:bg-soft-2"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    aria-label="Quitar"
                    onClick={() => remove(item.id)}
                    className="grid h-9 w-9 place-items-center justify-self-center rounded-lg border-[1.5px] border-line bg-white text-[#98A6BB] transition-colors hover:border-red hover:text-red"
                  >
                    <TrashIcon size={16} />
                  </button>
                </div>
              ))}
            </div>
            <Link
              href="/catalogo"
              className="mt-4 inline-flex h-11 items-center rounded-[9px] border-[1.5px] border-line-2 bg-white px-5 text-sm font-bold text-navy transition-colors hover:border-navy"
            >
              Seguir agregando
            </Link>
          </div>

          <aside className="overflow-hidden rounded-[14px] border-[1.5px] border-line">
            <div className="flex items-center justify-between bg-navy px-5 py-4 font-display text-base font-bold text-white">
              Solicitar cotización
              <span className="text-[12.5px] font-semibold text-white/70">
                {lines} {lines === 1 ? "repuesto" : "repuestos"} · {count} und.
              </span>
            </div>
            <QuoteForm items={detailed} onSuccess={onSubmitted} />
          </aside>
        </div>
      )}
    </div>
  );
}
