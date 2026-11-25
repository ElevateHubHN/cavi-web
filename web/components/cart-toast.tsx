"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "./cart-context";
import { getProduct } from "@/lib/products";
import { CheckIcon } from "./icons";

const VISIBLE_MS = 3500;

export function CartToast() {
  const { lastAdded } = useCart();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!lastAdded) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [lastAdded]);

  if (!visible || !lastAdded) return null;

  const product = getProduct(lastAdded.id);
  if (!product) return null;

  return (
    <div
      key={lastAdded.nonce}
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-1/2 z-[70] w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 animate-toast-in sm:bottom-6"
    >
      <div className="flex items-center gap-3 rounded-[12px] bg-navy py-3 pl-[14px] pr-4 text-white shadow-[0_18px_40px_rgba(11,37,69,0.35)]">
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-green text-white">
          <CheckIcon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[14px] font-bold leading-tight">
            Agregado a tu cotización
          </div>
          <div className="truncate text-[13px] text-on-navy">
            {product.name}
            {lastAdded.qty > 1 ? ` × ${lastAdded.qty}` : ""}
          </div>
        </div>
        <Link
          href="/cotizacion"
          onClick={() => setVisible(false)}
          className="flex-shrink-0 rounded-[8px] border border-white/25 px-3 py-[7px] text-[12.5px] font-bold text-white transition-colors hover:bg-white/10"
        >
          Ver solicitud
        </Link>
      </div>
    </div>
  );
}
