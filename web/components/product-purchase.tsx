"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "./cart-context";
import { CartIcon, TimerIcon } from "./icons";

export function ProductPurchase({ productId }: { productId: string }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  return (
    <div className="mt-[22px] rounded-[14px] border-[1.5px] border-line bg-soft p-5">
      <div className="flex items-center gap-[10px] font-display text-[15px] font-bold text-navy">
        <TimerIcon size={17} className="text-red" />
        Precio bajo cotización
      </div>
      <p className="mt-2 text-sm leading-[1.5] text-muted">
        Agrega este repuesto a tu solicitud para recibir precio, disponibilidad y
        tiempo de entrega.
      </p>

      <div className="mt-[18px] flex items-stretch gap-3">
        <div className="flex items-center overflow-hidden rounded-[9px] border-[1.5px] border-line-2 bg-white">
          <button
            type="button"
            aria-label="Disminuir cantidad"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="h-[52px] w-[46px] border-0 bg-white text-[22px] text-navy transition-colors hover:bg-soft-2"
          >
            −
          </button>
          <span className="w-12 text-center font-display text-[18px] font-bold text-navy">
            {qty}
          </span>
          <button
            type="button"
            aria-label="Aumentar cantidad"
            onClick={() => setQty((q) => q + 1)}
            className="h-[52px] w-[46px] border-0 bg-white text-[22px] text-navy transition-colors hover:bg-soft-2"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={() => add(productId, qty)}
          className="flex h-[52px] flex-1 items-center justify-center gap-[9px] rounded-[9px] bg-red text-[15.5px] font-bold text-white transition-colors hover:bg-red-dark"
        >
          <CartIcon size={19} />
          Agregar a cotización
        </button>
      </div>
      <Link
        href="/cotizacion"
        className="mt-[10px] flex h-[46px] w-full items-center justify-center rounded-[9px] border-[1.5px] border-navy bg-white text-[14.5px] font-bold text-navy transition-colors hover:bg-navy hover:text-white"
      >
        Ir a mi solicitud
      </Link>
    </div>
  );
}
