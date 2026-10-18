import { API_BASE, TENANT } from './config';

export class ApiError extends Error {
  constructor(message, kind, status) { super(message); this.kind = kind; this.status = status; }
}

async function req(path, { method = 'GET', body } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(API_BASE + path, {
      method, signal: ctl.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Tenant-ID': TENANT },
      body: body ? JSON.stringify(body) : undefined,
    });
    let j = null;
    try { j = await r.json(); } catch {}
    if (!r.ok || !j || j.ok === false) {
      const e = j && j.error;
      throw new ApiError((e && (e.message || (typeof e === 'string' && e))) || `Błąd serwera (${r.status})`, 'server', r.status);
    }
    return j.data;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.', 'network');
  } finally { clearTimeout(timer); }
}

const toItems = (lines) => lines.map((l) => ({ product_id: l.productId, variant_id: l.variantId, quantity: l.qty }));

export const getMenu = () => req(`/menu?tenant=${TENANT}`);
// UWAGA: kształt request/response poniższych 3 endpointów jest ZAŁOŻONY – do potwierdzenia z kontraktem CORE.
export const validateCart = (lines, fulfillment) => req('/cart/validate', { method: 'POST', body: { tenant: TENANT, items: toItems(lines), fulfillment } });
export const createOrder = (lines, fulfillment, customer, address) =>
  req('/orders', { method: 'POST', body: { tenant: TENANT, items: toItems(lines), fulfillment, customer, delivery_address: address || null } });
export const trackOrder = (token) => req(`/orders/track/${encodeURIComponent(token)}`);