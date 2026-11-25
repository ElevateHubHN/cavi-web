"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "./product-card";
import { BrandLogo } from "./brand-logo";
import { CloseIcon, FilterIcon } from "./icons";
import {
  products,
  catalogBrands,
  categoryOrder,
  categoryCounts,
  subcategories,
  isCategoryKey,
  isProductLine,
  getProductLine,
  formatCount,
  type ProductLine,
} from "@/lib/products";

const SORT_KEYS = ["relevancia", "marca", "solicitados"] as const;
type SortKey = (typeof SORT_KEYS)[number];

function isSortKey(value: string): value is SortKey {
  return SORT_KEYS.some((key) => key === value);
}

/** Líneas de negocio del catálogo. Si no hay ninguna marcada, se muestran todas. */
const lineOptions: { value: ProductLine; label: string }[] = [
  { value: "pesado", label: "Equipo pesado" },
  { value: "liviano", label: "Vehículo liviano" },
];

function ChevronDownIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** Clave «categoría|subcategoría»: dos categorías pueden tener subcategorías con el mismo nombre. */
function subKey(cat: string, sub: string): string {
  return `${cat}|${sub}`;
}

/** Subcategoría para los productos que aún no tienen una asignada. */
const OTHERS = "Otros";

/**
 * Subcategorías visibles por categoría: las del catálogo más "Otros", que solo
 * aparece cuando esa categoría tiene productos sin clasificar (así una
 * selección parcial nunca los oculta en silencio).
 */
const subsByCat: Record<string, string[]> = Object.fromEntries(
  categoryOrder.map((cat) => {
    const hasUnclassified = products.some((p) => p.cat === cat && !p.subcat);
    return [
      cat,
      hasUnclassified ? [...subcategories[cat], OTHERS] : subcategories[cat],
    ];
  })
);

function allSubKeys(cat: string): string[] {
  return subsByCat[cat].map((sub) => subKey(cat, sub));
}

export function CatalogView() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const catParamRaw = searchParams.get("cat");
  const catParam = catParamRaw && isCategoryKey(catParamRaw) ? catParamRaw : null;
  const lineParamRaw = searchParams.get("linea");
  const lineParam =
    lineParamRaw && isProductLine(lineParamRaw) ? lineParamRaw : null;

  const [selectedSubcats, setSelectedSubcats] = useState<Set<string>>(
    () => new Set(catParam ? allSubKeys(catParam) : [])
  );
  const [expandedCats, setExpandedCats] = useState<Set<string>>(
    () => new Set(catParam ? [catParam] : [])
  );
  // Se guarda como Set<string> para reusar `toggle`; los valores son ProductLine.
  const [selectedLines, setSelectedLines] = useState<Set<string>>(
    () => new Set(lineParam ? [lineParam] : [])
  );

  useEffect(() => {
    setSelectedSubcats(new Set(catParam ? allSubKeys(catParam) : []));
    if (catParam) {
      setExpandedCats((s) => new Set(s).add(catParam));
    }
  }, [catParam]);

  useEffect(() => {
    setSelectedLines(new Set(lineParam ? [lineParam] : []));
  }, [lineParam]);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [model, setModel] = useState("");
  const [sort, setSort] = useState<SortKey>("relevancia");

  function toggle(set: Set<string>, value: string): Set<string> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  /**
   * La categoría marca o desmarca todas sus subcategorías; luego el usuario
   * desmarca las que no quiere. Al marcarla se expande para que la selección se vea.
   */
  function toggleCat(cat: string) {
    const keys = allSubKeys(cat);
    const allSelected = keys.every((k) => selectedSubcats.has(k));
    setSelectedSubcats((s) => {
      const next = new Set(s);
      for (const k of keys) {
        if (allSelected) next.delete(k);
        else next.add(k);
      }
      return next;
    });
    if (!allSelected) {
      setExpandedCats((s) => new Set(s).add(cat));
    }
  }

  function toggleSubcat(cat: string, sub: string) {
    setSelectedSubcats((s) => toggle(s, subKey(cat, sub)));
  }

  function toggleExpanded(cat: string) {
    setExpandedCats((s) => toggle(s, cat));
  }

  function clearFilters() {
    setSelectedSubcats(new Set());
    setSelectedBrands(new Set());
    setSelectedLines(new Set());
    setModel("");
  }

  const selectionByCat = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const key of selectedSubcats) {
      const i = key.indexOf("|");
      const cat = key.slice(0, i);
      const set = map.get(cat) ?? new Set<string>();
      set.add(key.slice(i + 1));
      map.set(cat, set);
    }
    return map;
  }, [selectedSubcats]);

  // Una categoría completa cuenta como 1 filtro; una parcial, por subcategoría.
  let categoryFilterCount = 0;
  for (const [cat, sel] of selectionByCat) {
    categoryFilterCount += sel.size === subsByCat[cat].length ? 1 : sel.size;
  }
  const activeFilterCount =
    categoryFilterCount +
    selectedBrands.size +
    selectedLines.size +
    (model.trim() ? 1 : 0);

  const filtered = useMemo(() => {
    const modelQ = model.trim().toLowerCase();

    let list = products.filter((p) => {
      if (selectedLines.size > 0 && !selectedLines.has(getProductLine(p)))
        return false;
      if (selectionByCat.size > 0) {
        const sel = selectionByCat.get(p.cat);
        if (!sel) return false;
        // Con la categoría completa entran también los productos sin subcategoría;
        // con una selección parcial, solo las subcategorías elegidas.
        if (
          sel.size < subsByCat[p.cat].length &&
          !sel.has(p.subcat ?? OTHERS)
        )
          return false;
      }
      if (selectedBrands.size > 0 && !selectedBrands.has(p.brand)) return false;
      if (modelQ && !p.compat.some((m) => m.toLowerCase().includes(modelQ)))
        return false;
      if (q) {
        const haystack = [
          p.name,
          p.part,
          p.brand,
          p.cat,
          p.subcat ?? "",
          p.compat.join(" "),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (sort === "marca") {
      list = [...list].sort((a, b) => a.brand.localeCompare(b.brand, "es"));
    }
    return list;
  }, [selectionByCat, selectedBrands, selectedLines, model, q, sort]);

  return (
    <div className="shell pb-[60px] pt-[26px]">
      <div className="mb-[14px] text-[13px] text-muted">
        <Link href="/">Inicio</Link> <span className="text-[#B7C1D0]">/</span>{" "}
        <span className="font-semibold text-navy">Catálogo</span>
        {q && (
          <>
            {" "}
            <span className="text-[#B7C1D0]">/</span>{" "}
            <span className="text-navy">“{searchParams.get("q")}”</span>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[262px_1fr]">
        <aside className="overflow-hidden rounded-[14px] border-[1.5px] border-line bg-white lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100vh_-_7rem)] lg:flex-col">
          <div className="flex items-center gap-[9px] bg-navy px-[18px] py-[14px] font-display text-[15px] font-bold text-white">
            <FilterIcon size={16} className="text-red" />
            Filtrar
          </div>
          {/* En desktop el panel tiene scroll propio para no desbordar la ventana
              mientras queda fijo al hacer scroll. */}
          <div className="p-[18px] lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8494AB]">
              Línea
            </div>
            <div className="mt-[10px] flex flex-col gap-[2px]">
              {lineOptions.map(({ value, label }) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-[9px] rounded-[7px] px-2 py-[7px] text-sm text-ink-2 hover:bg-soft"
                >
                  <input
                    type="checkbox"
                    checked={selectedLines.has(value)}
                    onChange={() => setSelectedLines((s) => toggle(s, value))}
                    className="h-[15px] w-[15px] accent-red"
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="my-4 h-px bg-[#EDF1F6]" />

            <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8494AB]">
              Categoría
            </div>
            <div className="mt-[10px] flex flex-col gap-[2px]">
              {categoryOrder.map((cat) => {
                const isExpanded = expandedCats.has(cat);
                const subs = subsByCat[cat];
                const subCount = subs.filter((sub) =>
                  selectedSubcats.has(subKey(cat, sub))
                ).length;
                const allSelected = subCount > 0 && subCount === subs.length;
                return (
                  <div key={cat}>
                    <div className="flex items-center rounded-[7px] pl-2 hover:bg-soft">
                      <input
                        type="checkbox"
                        aria-label={`Filtrar por ${cat}`}
                        checked={allSelected}
                        // `indeterminate` no existe como atributo JSX; solo se puede fijar desde el DOM.
                        ref={(el) => {
                          if (el)
                            el.indeterminate = !allSelected && subCount > 0;
                        }}
                        onChange={() => toggleCat(cat)}
                        className="h-[15px] w-[15px] cursor-pointer accent-red"
                      />
                      <button
                        type="button"
                        onClick={() => toggleExpanded(cat)}
                        aria-expanded={isExpanded}
                        className="flex flex-1 items-center justify-between gap-2 rounded-[7px] px-[9px] py-[7px] text-left text-sm text-ink-2"
                      >
                        <span>{cat}</span>
                        <span className="flex items-center gap-[6px] text-[12px] text-muted-3">
                          {!isExpanded && subCount > 0 && !allSelected && (
                            <span
                              aria-label={`${subCount} subcategorías seleccionadas`}
                              className="grid h-[17px] min-w-[17px] place-items-center rounded-full bg-red px-1 text-[10.5px] font-bold leading-none text-white"
                            >
                              {subCount}
                            </span>
                          )}
                          {formatCount(categoryCounts[cat])}
                          <ChevronDownIcon
                            className={`transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </span>
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mb-1 ml-[7px] flex flex-col gap-[2px] border-l border-[#EDF1F6] pl-[13px]">
                        {subs.map((sub) => (
                          <label
                            key={sub}
                            className="flex cursor-pointer items-center gap-[9px] rounded-[7px] px-2 py-[6px] text-[13px] text-muted hover:bg-soft"
                          >
                            <input
                              type="checkbox"
                              checked={selectedSubcats.has(subKey(cat, sub))}
                              onChange={() => toggleSubcat(cat, sub)}
                              className="h-[13px] w-[13px] accent-red"
                            />
                            {sub}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="my-4 h-px bg-[#EDF1F6]" />

            <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8494AB]">
              Marca del repuesto
            </div>
            <div className="mt-[10px] flex flex-col gap-[2px]">
              {catalogBrands.map((brand) => (
                <label
                  key={brand}
                  className="flex cursor-pointer items-center gap-[9px] rounded-[7px] px-2 py-[7px] text-sm text-ink-2 hover:bg-soft"
                >
                  <input
                    type="checkbox"
                    checked={selectedBrands.has(brand)}
                    onChange={() => setSelectedBrands((s) => toggle(s, brand))}
                    className="h-[15px] w-[15px] accent-red"
                  />
                  <BrandLogo
                    name={brand}
                    className="h-[24px] w-[108px] justify-start text-[13px]"
                    imgClassName="object-left"
                  />
                </label>
              ))}
            </div>

            <div className="my-4 h-px bg-[#EDF1F6]" />

            <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8494AB]">
              Modelo de vehículo
            </div>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Ej. Cascadia, T680, VNL…"
              className="mt-[10px] h-10 w-full rounded-lg border-[1.5px] border-line-2 px-3 text-sm outline-none focus:border-navy"
            />
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 h-11 w-full rounded-lg bg-navy text-sm font-bold text-white transition-colors hover:bg-navy-dark"
            >
              Limpiar filtros
            </button>
          </div>
        </aside>

        <div>
          <div className="mb-5 flex items-center justify-between gap-4 rounded-[12px] border-[1.5px] border-line bg-soft px-[18px] py-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-ink-2">
              <span>
                <b className="font-display text-navy">{filtered.length}</b>{" "}
                repuestos encontrados
              </span>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-[5px] rounded-full border-[1.5px] border-line-2 bg-white px-3 py-[5px] text-[12.5px] font-semibold text-muted transition-colors hover:border-red hover:text-red"
                >
                  <CloseIcon size={12} />
                  Limpiar filtros ({activeFilterCount})
                </button>
              )}
            </div>
            <div className="flex items-center gap-[10px] text-sm text-muted">
              <span className="hidden sm:inline">Ordenar por</span>
              <select
                value={sort}
                onChange={(e) => {
                  if (isSortKey(e.target.value)) setSort(e.target.value);
                }}
                className="h-[38px] cursor-pointer rounded-lg border-[1.5px] border-line-2 bg-white px-3 font-semibold text-navy outline-none"
              >
                <option value="relevancia">Relevancia</option>
                <option value="marca">Marca de equipo A-Z</option>
                <option value="solicitados">Más solicitados</option>
              </select>
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="rounded-[14px] border-[1.5px] border-dashed border-line-2 bg-soft py-16 text-center">
              <div className="font-display text-lg font-bold text-navy">
                Sin resultados
              </div>
              <p className="mt-2 text-sm text-muted">
                Ajusta los filtros o escríbenos el N° de parte y lo ubicamos por
                ti.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
