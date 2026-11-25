import { categoryOrder, getProduct, type Product } from "@/lib/products";

/** `discountPct`: porcentaje de descuento entero (1 a 90), solo si la oferta lo tiene. */
export type Offer = { productId: string; discountPct?: number };

export type ResolvedOffer = {
  product: Product;
  discountPct?: number;
};

/**
 * Ofertas vigentes: cada producto con su porcentaje de descuento, si lo tiene.
 * Por ahora son de ejemplo, hasta cargar las ofertas reales de CAVI: los tres
 * primeros con descuento y el resto sin porcentaje.
 */
export const offers: Offer[] = [
  { productId: "p7", discountPct: 20 },
  { productId: "p6", discountPct: 15 },
  { productId: "p4", discountPct: 15 },
  { productId: "p3" },
  { productId: "p9" },
  { productId: "p8" },
  { productId: "p5" },
  { productId: "p11" },
];

const MIN_PCT = 1;
const MAX_PCT = 90;

function isValidPct(n: number): boolean {
  return Number.isInteger(n) && n >= MIN_PCT && n <= MAX_PCT;
}

/**
 * Ofertas listas para mostrar: descarta productos inexistentes, porcentajes
 * fuera de rango y productos repetidos (gana la primera entrada válida).
 */
export function resolveOffers(list: Offer[] = offers): ResolvedOffer[] {
  const seen = new Set<string>();
  const result: ResolvedOffer[] = [];
  for (const o of list) {
    if (seen.has(o.productId)) continue;
    const product = getProduct(o.productId);
    if (!product) continue;
    if (o.discountPct !== undefined && !isValidPct(o.discountPct)) continue;
    seen.add(o.productId);
    result.push({ product, discountPct: o.discountPct });
  }
  return result;
}

export function hasOffers(list: Offer[] = offers): boolean {
  return resolveOffers(list).length > 0;
}

/** Categorías presentes en las ofertas, en el orden del catálogo. */
export function offerCategories(list: ResolvedOffer[]): string[] {
  const present = new Set(list.map((o) => o.product.cat));
  const ordered: string[] = categoryOrder.filter((c) => present.has(c));
  const rest = Array.from(present).filter((c) => !ordered.includes(c));
  return [...ordered, ...rest];
}
