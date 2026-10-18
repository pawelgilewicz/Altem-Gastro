import { API_BASE, TENANT_ID } from './config';
import { auth } from './services';

export class ApiError extends Error {
  constructor(message, kind, status) { super(message); this.kind = kind; this.status = status; }
}
const MSG = {
  network: 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.', timeout: 'Serwer nie odpowiada. Spróbuj ponownie.',
  auth: 'Sesja wygasła lub brak uprawnień. Zaloguj się ponownie.', notfound: 'Nie znaleziono zasobu.',
  conflict: 'Zamówienie zmieniło się w trakcie. Odśwież koszyk.', validation: 'Dane są nieprawidłowe.', server: 'Błąd serwera. Spróbuj za chwilę.',
};
const kindOf = (st) => (st === 401 || st === 403 ? 'auth' : st === 404 ? 'notfound' : st === 409 ? 'conflict' : st === 422 || st === 400 ? 'validation' : 'server');

async function req(path, { method = 'GET', body, headers, quiet } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const token = await auth.getToken();
    const r = await fetch(API_BASE + path, {
      method, signal: ctl.signal, body: body ? JSON.stringify(body) : undefined,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Tenant-ID': TENANT_ID, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    });
    let j = null; try { j = await r.json(); } catch {}
    if (!r.ok || !j || j.ok === false) {
      if (__DEV__ && !quiet) console.log('[api]', method, path, r.status, JSON.stringify(j));
      const e = j && j.error; const kind = r.ok ? 'validation' : kindOf(r.status);
      throw new ApiError((e && (e.message || (typeof e === 'string' && e))) || MSG[kind], kind, r.status);
    }
    return j.data;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    const kind = e && e.name === 'AbortError' ? 'timeout' : 'network';
    throw new ApiError(MSG[kind], kind);
  } finally { clearTimeout(timer); }
}
const q = `tenant=${TENANT_ID}`;

export const getVenue = () => req(`/venue?${q}`);
// Opcjonalny: ten endpoint jest w specyfikacji v0.2, ale RC zwraca dla niego 404 (TODO INTEGRATION).
export const getVenueStatus = () => req(`/venue/status?${q}`, { quiet: true });
export const getMenu = () => req(`/menu?${q}`);

// Kształt requestu koszyka NIEPOTWIERDZONY (Core zwrócił „Nieprawidłowy koszyk" dla pierwszej wersji).
// Klient próbuje kandydatów i zapamiętuje działający. Docelowo: zostawić jeden, zgodny z kontraktem Core.
const row = (l, k) => ({ product_id: l.productId, variant_id: l.variantId, [k]: l.qty, ...(l.modifiers.length ? { modifiers: l.modifiers } : {}) });
const SHAPES = [
  (l, f) => ({ tenant: TENANT_ID, items: l.map((x) => row(x, 'quantity')), fulfillment: f }),
  (l, f) => ({ tenant: TENANT_ID, items: l.map((x) => row(x, 'qty')), order_type: f }),
  (l, f) => ({ tenant: TENANT_ID, lines: l.map((x) => row(x, 'quantity')), fulfillment: f }),
  (l, f) => ({ tenant: TENANT_ID, cart: { items: l.map((x) => row(x, 'quantity')) }, fulfillment: f }),
  (l, f) => ({ tenant: TENANT_ID, items: l.map((x) => row(x, 'quantity')) }),
];
let shapeIdx = 0;
export async function validateCart(lines, fulfillment) {
  let last;
  for (let n = 0; n < SHAPES.length; n++) {
    const k = (shapeIdx + n) % SHAPES.length;
    try { const d = await req('/cart/validate', { method: 'POST', body: SHAPES[k](lines, fulfillment) }); shapeIdx = k; return d; }
    catch (e) { last = e; if (e.kind !== 'validation') throw e; }
  }
  throw last;
}
// Idempotency-Key: do potwierdzenia, czy Core go obsługuje (pkt 17 specyfikacji).
export const createOrder = (lines, fulfillment, customer, address, idemKey) =>
  req('/orders', { method: 'POST', headers: { 'Idempotency-Key': idemKey }, body: { ...SHAPES[shapeIdx](lines, fulfillment), customer, delivery_address: address || null } });
export const trackOrder = (token) => req(`/orders/track/${encodeURIComponent(token)}`);

// Auth: endpointy i pola ZAŁOŻONE – do potwierdzenia z kontraktem Core.
export const login = (email, password, ts) => req('/auth/login', { method: 'POST', body: { tenant: TENANT_ID, email, password, turnstile_token: ts } });
export const register = (p, ts) => req('/auth/register', { method: 'POST', body: { tenant: TENANT_ID, ...p, turnstile_token: ts } });
export const me = () => req('/auth/me');
export const logoutApi = () => req('/auth/logout', { method: 'POST' });