import * as SecureStore from 'expo-secure-store';

export const pick = (o, ...keys) => keys.map((k) => k.split('.').reduce((a, p) => (a == null ? a : a[p]), o)).find((v) => v != null);

export const storage = {
  get: (k) => SecureStore.getItemAsync(k).catch(() => null),
  set: (k, v) => SecureStore.setItemAsync(k, v).catch(() => {}),
  del: (k) => SecureStore.deleteItemAsync(k).catch(() => {}),
};
export const auth = { getToken: () => storage.get('gastro_auth_token'), setToken: (t) => storage.set('gastro_auth_token', t), clear: () => storage.del('gastro_auth_token') };

// Analityka działa tylko za zgodą (ConsentProvider ustawia flagę). Provider analityki = zmiana tylko tutaj.
let analyticsOn = false;
export const setAnalyticsConsent = (v) => { analyticsOn = !!v; };
export const track = (event, props = {}) => { if (analyticsOn && __DEV__) console.log('[analytics]', event, props); };