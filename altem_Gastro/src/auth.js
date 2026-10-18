import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Switch } from 'react-native';
import { TENANT } from './config';
import { login, register, me, logoutApi } from './api';
import { auth, pick } from './services';
import { useS, Button } from './ui';
import { useTheme } from './theme';
import { useConsent } from './consent';

// import { WebView } from 'react-native-webview';

const Ctx = createContext({ status: 'loading', user: null });
export const useAuth = () => useContext(Ctx);
const userOf = (d) => pick(d, 'user', 'customer', 'data.user') || d;

export function AuthProvider({ children }) {
  const [st, setSt] = useState({ status: 'loading', user: null });
  useEffect(() => {
    (async () => {
      const tok = await auth.getToken();
      if (!tok) return setSt({ status: 'guest', user: null });
      try { setSt({ status: 'authed', user: userOf(await me()) }); }
      catch (e) { if (e.kind === 'auth') await auth.clear(); setSt({ status: 'guest', user: null }); }
    })();
  }, []);
  const finish = async (d) => {
    const tok = pick(d, 'token', 'access_token', 'session_token');
    if (!tok) return { pending: true, message: pick(d, 'message') }; // np. wymagana aktywacja e-mail
    await auth.setToken(tok);
    const u = await me().then(userOf).catch(() => pick(d, 'user', 'customer') || {});
    setSt({ status: 'authed', user: u });
    return {};
  };
  const value = {
    ...st,
    signIn: async (email, pw, ts) => finish(await login(email, pw, ts)),
    signUp: async (p, ts) => finish(await register(p, ts)),
    signOut: async () => { await logoutApi().catch(() => {}); await auth.clear(); setSt({ status: 'guest', user: null }); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Cloudflare Turnstile w WebView. Wymaga: npx expo install react-native-webview i siteKey w config.js.
function Turnstile({ onToken }) {
  const { WebView } = require('react-native-webview');
  const { siteKey, origin } = TENANT.turnstile;
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script></head><body style="margin:0;background:transparent"><div id="w"></div><script>var i=setInterval(function(){if(window.turnstile){clearInterval(i);turnstile.render('#w',{sitekey:'${siteKey}',theme:'dark',callback:function(k){window.ReactNativeWebView.postMessage(k)},'expired-callback':function(){window.ReactNativeWebView.postMessage('')}})}},200)</script></body></html>`;
  return <View style={{ height: 80, marginTop: 10 }}><WebView originWhitelist={['*']} source={{ html, baseUrl: origin }} onMessage={(e) => onToken(e.nativeEvent.data || null)} style={{ backgroundColor: 'transparent' }} /></View>;
}

export function AuthForm({ onDone, onBack }) {
  const s = useS(); const t = useTheme(); const { signIn, signUp } = useAuth(); const consent = useConsent();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [terms, setTerms] = useState(false); const [mkt, setMkt] = useState(!!consent.marketing);
  const [ts, setTs] = useState(null); const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); const [err, setErr] = useState(null);
  const needTs = !!TENANT.turnstile.siteKey;
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const reg = mode === 'register';

  const submit = async () => {
    setErr(null); setMsg(null);
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return setErr('Podaj poprawny adres e-mail.');
    if (!f.password) return setErr('Podaj hasło.');
    if (reg && (!f.name.trim() || !terms)) return setErr('Podaj imię i zaakceptuj regulamin oraz politykę prywatności.');
    if (needTs && !ts) return setErr('Potwierdź, że nie jesteś robotem.');
    setBusy(true);
    try {
      const r = reg ? await signUp({ name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), password: f.password, marketing_consent: mkt }, ts) : await signIn(f.email.trim(), f.password, ts);
      if (r.pending) { setMsg(r.message || 'Konto utworzone. Sprawdź e-mail, aktywuj konto, a potem zaloguj się.'); setMode('login'); } else onDone();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack}><Text style={s.muted}>‹ Wróć</Text></Pressable>
      <Text style={[s.h2, { marginTop: 8 }]}>{reg ? 'Załóż konto' : 'Zaloguj się'}</Text>
      {reg && <TextInput style={s.input} placeholder="Imię" placeholderTextColor={t.colors.muted} value={f.name} onChangeText={set('name')} />}
      <TextInput style={s.input} placeholder="E-mail" placeholderTextColor={t.colors.muted} autoCapitalize="none" keyboardType="email-address" value={f.email} onChangeText={set('email')} />
      {reg && <TextInput style={s.input} placeholder="Telefon (opcjonalnie)" placeholderTextColor={t.colors.muted} keyboardType="phone-pad" value={f.phone} onChangeText={set('phone')} />}
      <TextInput style={s.input} placeholder="Hasło" placeholderTextColor={t.colors.muted} secureTextEntry autoCapitalize="none" value={f.password} onChangeText={set('password')} />
      {reg && (
        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Switch value={terms} onValueChange={setTerms} trackColor={{ true: t.colors.primary }} /><Text style={[s.optTxt, { fontSize: 13 }]}>Akceptuję regulamin i politykę prywatności</Text></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}><Switch value={mkt} onValueChange={setMkt} trackColor={{ true: t.colors.primary }} /><Text style={[s.optTxt, { fontSize: 13 }]}>Chcę otrzymywać oferty (opcjonalnie)</Text></View>
        </View>
      )}
      {needTs && <Turnstile onToken={setTs} />}
      {!!err && <Text style={[s.muted, { color: t.colors.secondary, marginTop: 12 }]}>{err}</Text>}
      {!!msg && <Text style={[s.muted, { color: t.colors.primary, marginTop: 12 }]}>{msg}</Text>}
      <Button title={reg ? 'Załóż konto' : 'Zaloguj się'} onPress={submit} loading={busy} style={{ flex: 0, marginTop: 16 }} />
      <Pressable onPress={() => { setMode(reg ? 'login' : 'register'); setErr(null); }}><Text style={[s.muted, { textAlign: 'center', marginTop: 16 }]}>{reg ? 'Masz już konto? Zaloguj się' : 'Nie masz konta? Załóż je'}</Text></Pressable>
    </ScrollView>
  );
}