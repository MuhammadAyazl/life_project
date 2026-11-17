'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Product } from '@/lib/types';

/**
 * The cart lives in the browser (works for guests too). It only stores a display snapshot -
 * at checkout the server re-reads every price from the database, so editing localStorage
 * cannot change what a customer pays.
 */
export interface CartLine {
  id: string;
  qty: number;
  name: string;
  slug: string;
  price: number;
  category: string;
  image: string;
  art: string;
}

interface CartState {
  lines: CartLine[];
  count: number;
  subtotal: number;
  ready: boolean;
  qtyOf: (id: string) => number;
  add: (p: Product, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const KEY = 'sf_cart_v2';
export const MAX_QTY = 20;
const CartContext = createContext<CartState | null>(null);

function read(): CartLine[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((l) => l && typeof l.id === 'string' && l.qty > 0) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(read());
    setReady(true);
    // keep several open tabs in sync
    const onStorage = (e: StorageEvent) => e.key === KEY && setLines(read());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* storage full or blocked - cart still works for this tab */
    }
  }, [lines, ready]);

  const add = useCallback((p: Product, qty = 1) => {
    setLines((prev) => {
      const found = prev.find((l) => l.id === p.id);
      if (found) return prev.map((l) => (l.id === p.id ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l));
      return [
        ...prev,
        {
          id: p.id,
          qty: Math.min(MAX_QTY, qty),
          name: p.name,
          slug: p.slug,
          price: p.price,
          category: p.category,
          image: p.images[0] ?? '',
          art: p.art,
        },
      ];
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((prev) =>
      qty <= 0 ? prev.filter((l) => l.id !== id) : prev.map((l) => (l.id === id ? { ...l, qty: Math.min(MAX_QTY, qty) } : l)),
    );
  }, []);

  const remove = useCallback((id: string) => setLines((prev) => prev.filter((l) => l.id !== id)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartState>(() => {
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const subtotal = Math.round(lines.reduce((s, l) => s + l.qty * l.price, 0) * 100) / 100;
    return {
      lines,
      count,
      subtotal,
      ready,
      qtyOf: (id) => lines.find((l) => l.id === id)?.qty ?? 0,
      add,
      setQty,
      remove,
      clear,
    };
  }, [lines, ready, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
