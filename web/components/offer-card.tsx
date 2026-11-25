"use client";

import Link from "next/link";
import type { ResolvedOffer } from "@/lib/offers";
import { useCart } from "./cart-context";
import { CartIcon } from "./icons";
import { ProductImage } from "./product-image";

export function OfferCard({ offer }: { offer: ResolvedOffer }) {
  const { add } = useCart();
  const { product, discountPct } = offer;
  const href = `/producto/${product.id}`;

  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] border-[1.5px] border-line bg-white transition-shadow hover:shadow-[0_18px_40px_rgba(11,37,69,0.1)]">
      <Link
        href={href}
        className="relative grid h-[170px] place-items-center overflow-hidden bg-gradient-to-br from-soft-2 to-[#E4E9F1]"
      >
        <ProductImage
          product={product}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-navy/10 via-transparent to-white/5" />
        <span className="absolute left-3 top-3 rounded-[5px] bg-red px-[9px] py-1 text-[12px] font-extrabold tracking-[0.02em] text-white">
          {discountPct !== undefined ? (
            <>
              <span aria-hidden="true">-{discountPct}%</span>
              <span className="sr-only">{discountPct}% de descuento</span>
            </>
          ) : (
            "Oferta"
          )}
        </span>
      </Link>

      <div className="flex flex-1 flex-col px-4 pb-[17px] pt-[15px]">
        <Link
          href={href}
          className="min-h-[42px] font-display text-[16.5px] font-bold leading-[1.25] text-navy"
        >
          {product.name}
        </Link>
        {product.compat.length > 0 && (
          <div className="mt-[6px] text-[12.5px] leading-[1.4] text-muted">
            Aplicación: {product.compat.join(", ")}
          </div>
        )}

        <div className="mt-auto pt-4">
          <button
            type="button"
            onClick={() => add(product.id)}
            className="flex h-[42px] w-full items-center justify-center gap-[7px] rounded-lg bg-red text-sm font-bold text-white transition-colors hover:bg-red-dark"
          >
            <CartIcon size={17} />
            Agregar a cotización
          </button>
        </div>
      </div>
    </div>
  );
}
