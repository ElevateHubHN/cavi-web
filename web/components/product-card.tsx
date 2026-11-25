"use client";

import Link from "next/link";
import type { Product } from "@/lib/products";
import { useCart } from "./cart-context";
import { PlusIcon } from "./icons";
import { BrandLogo } from "./brand-logo";
import { ProductImage } from "./product-image";

export function ProductCard({
  product,
  variant = "grid",
}: {
  product: Product;
  variant?: "featured" | "grid";
}) {
  const { add } = useCart();
  const featured = variant === "featured";
  const href = `/producto/${product.id}`;

  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] border-[1.5px] border-line bg-white transition-shadow hover:shadow-[0_18px_40px_rgba(11,37,69,0.1)]">
      <Link
        href={href}
        className="relative grid place-items-center overflow-hidden bg-gradient-to-br from-soft-2 to-[#E4E9F1]"
        style={{ height: featured ? 170 : 158 }}
      >
        <ProductImage
          product={product}
          sizes={featured ? "(min-width: 1024px) 25vw, 50vw" : "(min-width: 1024px) 33vw, 50vw"}
        />
        <span className="absolute inset-0 bg-gradient-to-t from-navy/10 via-transparent to-white/5" />
        <span className="absolute left-3 top-3 rounded-[5px] bg-navy px-[9px] py-1 text-[10.5px] font-bold tracking-[0.05em] text-white">
          {product.cat}
        </span>
      </Link>

      <div className="flex flex-1 flex-col px-4 pb-[17px] pt-[15px]">
        <Link
          href={href}
          className={`font-display font-bold leading-[1.25] text-navy ${
            featured ? "min-h-[42px] text-[16.5px]" : "min-h-[40px] text-base"
          }`}
        >
          {product.name}
        </Link>
        <BrandLogo
          name={product.brand}
          className="mt-2 h-[16px] w-[70px] justify-start text-[11px]"
          imgClassName="object-left"
        />
        <div
          className={`mt-[6px] font-mono text-muted ${
            featured ? "text-[12.5px]" : "text-[12px]"
          }`}
        >
          N° {product.part}
        </div>

        {featured ? (
          <div className="mt-3 flex items-center gap-[6px] border-t border-dashed border-line pt-[14px]">
            <span className="flex flex-1 items-center gap-[6px] text-[13px] font-bold text-green">
              <span className="h-2 w-2 rounded-full bg-green" />
              Disponible bajo pedido
            </span>
          </div>
        ) : (
          <span className="mt-[10px] flex items-center gap-[6px] text-[12.5px] font-bold text-green">
            <span className="h-[7px] w-[7px] rounded-full bg-green" />
            Bajo pedido
          </span>
        )}

        <button
          type="button"
          onClick={() => add(product.id)}
          className={`mt-3 flex w-full items-center justify-center gap-[7px] rounded-lg bg-red font-bold text-white transition-colors hover:bg-red-dark ${
            featured ? "h-[42px] text-sm" : "h-[40px] text-[13.5px]"
          }`}
        >
          <PlusIcon size={featured ? 17 : 16} />
          {featured ? "Agregar a cotización" : "Agregar"}
        </button>
      </div>
    </div>
  );
}
