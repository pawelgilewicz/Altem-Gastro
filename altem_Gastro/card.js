import React, { createContext, useContext, useReducer, useMemo } from 'react';

// Koszyk trzyma tylko identyfikatory + ilości. Cena w snapshotcie służy wyłącznie do podglądu;
// ostateczną wycenę zwraca CORE (POST /cart/validate).
function reducer(lines, a) {
  switch (a.type) {
    case 'add': {
      const key = a.variantId;
      const hit = lines.find((l) => l.key === key);
      return hit ? lines.map((l) => (l.key === key ? { ...l, qty: l.qty + a.qty } : l)) : [...lines, { key, productId: a.productId, variantId: a.variantId, name: a.name, variantName: a.variantName, priceMinor: a.priceMinor, qty: a.qty }];
    }
    case 'qty': return a.qty < 1 ? lines.filter((l) => l.key !== a.key) : lines.map((l) => (l.key === a.key ? { ...l, qty: a.qty } : l));
    case 'clear': return [];
    default: return lines;
  }
}

const Ctx = createContext(null);
export const CartProvider = ({ children }) => {
  const [lines, dispatch] = useReducer(reducer, []);
  const value = useMemo(() => ({ lines, dispatch, count: lines.reduce((s, l) => s + l.qty, 0), estimateMinor: lines.reduce((s, l) => s + l.priceMinor * l.qty, 0) }), [lines]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
export const useCart = () => useContext(Ctx);