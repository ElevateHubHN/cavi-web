/**
 * Categorías de repuesto para vehículo liviano (carros asiáticos y americanos)
 * que se muestran en el inicio.
 *
 * Son provisionales: falta confirmar los nombres definitivos y si deben
 * enlazar a un catálogo propio de línea liviana.
 */

export type LightLineIconName =
  | "filter"
  | "hose"
  | "belt"
  | "brake"
  | "suspension"
  | "electrical"
  | "oil"
  | "gasket";

import type { CatalogCategoryKey } from "./products";

export type LightLineCategory = {
  name: string;
  /** Icono de components/light-line-icon.tsx. */
  icon: LightLineIconName;
  /** Piezas de ejemplo que se muestran en la tarjeta. */
  tag: string;
  /** Categoría del catálogo a la que lleva la tarjeta. */
  cat: CatalogCategoryKey;
  /**
   * Miniatura de la tarjeta. Mientras no haya fotos de línea liviana se
   * usan fotos del catálogo de equipo pesado.
   */
  image: string;
};

export const lightLineCategories: LightLineCategory[] = [
  {
    name: "Filtros",
    icon: "filter",
    tag: "Aceite, aire, combustible y cabina",
    cat: "Filtros",
    image: "/images/products/p4.webp",
  },
  {
    name: "Mangueras",
    icon: "hose",
    tag: "Radiador, calefacción y combustible",
    cat: "Refrigeración",
    image: "/images/products/p8.webp",
  },
  {
    name: "Bandas y fajas",
    icon: "belt",
    tag: "Accesorios, tiempo y tensores",
    cat: "Motor",
    image: "/images/products/p13.webp",
  },
  {
    name: "Frenos",
    icon: "brake",
    tag: "Pastillas, discos, zapatas y líquido",
    cat: "Frenos",
    image: "/images/products/p7.webp",
  },
  {
    name: "Suspensión",
    icon: "suspension",
    tag: "Amortiguadores, rótulas y bujes",
    cat: "Suspensión",
    image: "/images/products/p16.webp",
  },
  {
    name: "Sistema eléctrico",
    icon: "electrical",
    tag: "Baterías, alternadores y arranques",
    cat: "Eléctricos",
    image: "/images/products/p9.webp",
  },
  {
    name: "Lubricantes",
    icon: "oil",
    tag: "Aceite de motor, caja y diferencial",
    cat: "Lubricantes",
    image: "/images/products/p5.webp",
  },
  {
    name: "Empaques",
    icon: "gasket",
    tag: "Culata, tapa de válvulas y retenedores",
    cat: "Motor",
    image: "/images/products/p2.webp",
  },
];

/** Destino de la tarjeta: el catálogo filtrado por línea liviana y categoría. */
export function lightLineHref(category: LightLineCategory): string {
  return `/catalogo?linea=liviano&cat=${encodeURIComponent(category.cat)}`;
}
