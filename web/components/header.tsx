"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Logo } from "./logo";
import {
  SearchIcon,
  CartIcon,
  UserIcon,
  MenuIcon,
  CloseIcon,
  TagIcon,
} from "./icons";
import { useCart } from "./cart-context";
import { ProductImage } from "./product-image";
import { searchProducts, categoryOrder } from "@/lib/products";
import { isLoggedIn, onSessionChange } from "@/lib/portal";
import { hasOffers } from "@/lib/offers";

const SHOW_OFFERS = hasOffers();

const NAV = [
  { label: "Inicio", href: "/" },
  { label: "Catálogo", href: "/catalogo" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Sucursales", href: "/nosotros#sucursales" },
  { label: "Soporte", href: "/soporte" },
];

const MIN_QUERY = 2;
const MAX_SUGGESTIONS = 6;

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  const i = q ? text.toLowerCase().indexOf(q) : -1;
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-bold text-red">
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

export function Header() {
  const router = useRouter();
  const { count } = useCart();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [menuOpen, setMenuOpen] = useState(false);
  // La sesión se consulta al servidor después de montar: el HTML estático no la conoce.
  const [session, setSession] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const q = query.trim();
  const matches = useMemo(
    () => (q.length >= MIN_QUERY ? searchProducts(q, cat || undefined) : []),
    [q, cat]
  );
  const visible = matches.slice(0, MAX_SUGGESTIONS);
  const showPanel = open && q.length >= MIN_QUERY;

  const catalogHref = q
    ? `/catalogo?q=${encodeURIComponent(q)}${cat ? `&cat=${encodeURIComponent(cat)}` : ""}`
    : "/catalogo";

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (
        searchRef.current &&
        e.target instanceof Node &&
        !searchRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    let active = true;
    const sync = () => {
      void isLoggedIn().then((loggedIn) => {
        if (active) setSession(loggedIn);
      });
    };
    sync();
    const stop = onSessionChange(sync);
    return () => {
      active = false;
      stop();
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyUp);
    return () => document.removeEventListener("keydown", onKeyUp);
  }, [menuOpen]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    router.push(catalogHref);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!showPanel || visible.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % visible.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? visible.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0 && active < visible.length) {
      e.preventDefault();
      setOpen(false);
      router.push(`/producto/${visible[active].id}`);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white shadow-[0_1px_0_rgba(11,37,69,0.04)]">
      <div className="shell flex items-center gap-5 py-[14px] lg:gap-7">
        <Logo />

        <div
          ref={searchRef}
          className="relative hidden min-w-0 max-w-[520px] flex-1 lg:block"
        >
          <form
            onSubmit={onSearch}
            className="flex h-[46px] w-full items-center overflow-hidden rounded-lg border-[1.5px] border-line-2"
          >
            <select
              aria-label="Categoría"
              value={cat}
              onChange={(e) => {
                setCat(e.target.value);
                setActive(-1);
              }}
              className="h-full cursor-pointer border-0 border-r border-line-2 bg-soft px-3 text-[13px] font-semibold text-ink-2 outline-none"
            >
              <option value="">Todas las categorías</option>
              {categoryOrder.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(-1);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded={showPanel}
              aria-controls="header-suggestions"
              aria-autocomplete="list"
              placeholder="Buscar por N° de parte, marca o modelo de máquina…"
              className="h-full flex-1 border-0 px-[14px] text-sm outline-none"
            />
            <button
              type="submit"
              aria-label="Buscar"
              className="grid h-full place-items-center bg-navy px-[18px]"
            >
              <SearchIcon size={18} className="text-white" />
            </button>
          </form>

          {showPanel && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-lg border-[1.5px] border-line-2 bg-white shadow-[0_18px_40px_rgba(11,37,69,0.14)]">
              {visible.length > 0 ? (
                <>
                  <ul id="header-suggestions" role="listbox">
                    {visible.map((p, i) => (
                      <li key={p.id} role="option" aria-selected={i === active}>
                        <Link
                          href={`/producto/${p.id}`}
                          onClick={() => setOpen(false)}
                          onMouseEnter={() => setActive(i)}
                          className={`flex items-center gap-3 px-[14px] py-[10px] ${
                            i === active ? "bg-soft" : ""
                          }`}
                        >
                          <span className="relative h-[42px] w-[42px] shrink-0 overflow-hidden rounded-md border border-line bg-soft">
                            <ProductImage product={p} sizes="42px" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-navy">
                              <Highlight text={p.name} query={q} />
                            </span>
                            <span className="block truncate text-[12px] text-muted">
                              <Highlight text={p.part} query={q} /> · {p.brand}{" "}
                              · {p.cat}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={catalogHref}
                    onClick={() => setOpen(false)}
                    className="block border-t border-line bg-soft px-[14px] py-[10px] text-center text-[13px] font-bold text-navy transition-colors hover:text-red"
                  >
                    Ver{" "}
                    {matches.length === 1
                      ? "el resultado"
                      : `los ${matches.length} resultados`}{" "}
                    en el catálogo
                  </Link>
                </>
              ) : (
                <div className="px-[18px] py-5 text-center text-sm text-muted">
                  Sin coincidencias para{" "}
                  <b className="font-semibold text-navy">“{q}”</b>. Escríbenos
                  el N° de parte y lo ubicamos por ti.
                </div>
              )}
            </div>
          )}
        </div>

        <nav className="ml-auto hidden shrink-0 items-center gap-[22px] whitespace-nowrap text-[14.5px] font-semibold text-ink-2 xl:flex">
          {NAV.map((item, i) => (
            <Fragment key={`${item.label}-${i}`}>
              <Link
                href={item.href}
                className="transition-colors hover:text-red"
              >
                {item.label}
              </Link>
              {SHOW_OFFERS && item.href === "/catalogo" && (
                <Link
                  href="/ofertas"
                  className="flex h-[34px] items-center gap-[6px] whitespace-nowrap rounded-full bg-red px-[13px] text-[13.5px] font-bold text-white transition-colors hover:bg-red-dark"
                >
                  <TagIcon size={15} />
                  Ofertas
                </Link>
              )}
            </Fragment>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-[10px] xl:ml-0">
          {session && (
            <Link
              href="/portal"
              className="flex h-[46px] items-center gap-[7px] rounded-lg border-[1.5px] border-line-2 px-[13px] text-sm font-bold text-navy transition-colors hover:border-navy"
            >
              <UserIcon size={18} />
              <span className="hidden sm:inline">Mi portal</span>
            </Link>
          )}

          <Link
            href="/cotizacion"
            className="relative flex h-[46px] items-center gap-[9px] rounded-lg bg-red px-[18px] text-sm font-bold text-white transition-colors hover:bg-red-dark"
          >
            <CartIcon size={19} />
            <span className="hidden sm:inline">Cotización</span>
            <span className="absolute -right-[7px] -top-[7px] grid h-[21px] min-w-[21px] place-items-center rounded-full border-2 border-white bg-navy px-[5px] text-[11px] font-extrabold text-white">
              {count}
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="grid h-[46px] w-[46px] place-items-center rounded-lg border-[1.5px] border-line-2 text-navy transition-colors hover:border-navy xl:hidden"
          >
            {menuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={`overflow-hidden border-t border-line bg-white shadow-[0_18px_40px_rgba(11,37,69,0.14)] transition-all duration-300 ease-out xl:hidden ${
          menuOpen
            ? "visible max-h-[520px] opacity-100"
            : "invisible max-h-0 border-transparent opacity-0"
        }`}
      >
        <nav className="shell flex flex-col py-3">
          {NAV.map((item, i) => (
            <Fragment key={`m-${item.label}-${i}`}>
              <Link
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="border-b border-line py-[13px] text-[15.5px] font-semibold text-ink-2 transition-colors hover:text-red"
              >
                {item.label}
              </Link>
              {SHOW_OFFERS && item.href === "/catalogo" && (
                <Link
                  href="/ofertas"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-[9px] border-b border-line py-[13px] text-[15.5px] font-bold text-red transition-colors hover:text-red-dark"
                >
                  <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-red text-white">
                    <TagIcon size={14} />
                  </span>
                  Ofertas
                </Link>
              )}
            </Fragment>
          ))}

          {session && (
            <Link
              href="/portal"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-[9px] border-b border-line py-[13px] text-[15.5px] font-semibold text-navy transition-colors hover:text-red"
            >
              <UserIcon size={18} />
              Mi portal
            </Link>
          )}

          <Link
            href="/cotizacion"
            onClick={() => setMenuOpen(false)}
            className="my-4 flex h-[46px] items-center justify-center gap-[9px] rounded-lg bg-red px-[18px] text-sm font-bold text-white transition-colors hover:bg-red-dark"
          >
            <CartIcon size={19} />
            Cotización
            <span className="grid h-[21px] min-w-[21px] place-items-center rounded-full bg-navy px-[5px] text-[11px] font-extrabold text-white">
              {count}
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
