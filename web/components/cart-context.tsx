"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type CartLine = { id: string; qty: number };

export type LastAdded = { id: string; qty: number; nonce: number };

type CartContextValue = {
  items: CartLine[];
  count: number;
  lines: number;
  lastAdded: LastAdded | null;
  add: (id: string, qty?: number) => void;
  inc: (id: string) => void;
  dec: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  qtyOf: (id: string) => number;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "cavi-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [lastAdded, setLastAdded] = useState<LastAdded | null>(null);
  // Distingue adiciones repetidas del mismo producto para volver a mostrar el aviso.
  const nonceRef = useRef(0);
  const hydrated = useRef(false);

  // Se lee después de hidratar para que el HTML del servidor y el primer render coincidan.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      /* Datos guardados inválidos: el carrito empieza vacío. */
    }
    hydrated.current = true;
  }, []);

  // No se guarda antes de leer lo guardado, para no pisarlo.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* El almacenamiento puede no estar disponible (p. ej. navegación privada). */
    }
  }, [items]);

  const add = useCallback((id: string, qty: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((c) => c.id === id);
      if (existing) {
        return prev.map((c) =>
          c.id === id ? { ...c, qty: c.qty + qty } : c
        );
      }
      return [...prev, { id, qty }];
    });
    nonceRef.current += 1;
    setLastAdded({ id, qty, nonce: nonceRef.current });
  }, []);

  const changeQty = useCallback((id: string, delta: number) => {
    setItems((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c
      )
    );
  }, []);

  const inc = useCallback((id: string) => changeQty(id, 1), [changeQty]);
  const dec = useCallback((id: string) => changeQty(id, -1), [changeQty]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const qtyOf = useCallback(
    (id: string) => items.find((c) => c.id === id)?.qty ?? 0,
    [items]
  );

  const count = useMemo(
    () => items.reduce((sum, c) => sum + c.qty, 0),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count,
      lines: items.length,
      lastAdded,
      add,
      inc,
      dec,
      remove,
      clear,
      qtyOf,
    }),
    [items, count, lastAdded, add, inc, dec, remove, clear, qtyOf]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
