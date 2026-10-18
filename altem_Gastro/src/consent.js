import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, Text, Switch } from 'react-native';
import { storage, setAnalyticsConsent } from './services';
import { useS, Button, Sheet } from './ui';
import { useTheme } from './theme';

const KEY = 'gastro_consent_v1';
const Ctx = createContext({ status: 'loading' });
export const useConsent = () => useContext(Ctx);

export function ConsentProvider({ children }) {
  const [c, setC] = useState({ status: 'loading', analytics: false, marketing: false });
  useEffect(() => {
    storage.get(KEY).then((raw) => {
      if (!raw) return setC({ status: 'undecided', analytics: false, marketing: false });
      try { const v = JSON.parse(raw); setAnalyticsConsent(v.analytics); setC({ status: 'decided', analytics: !!v.analytics, marketing: !!v.marketing }); }
      catch { setC({ status: 'undecided', analytics: false, marketing: false }); }
    });
  }, []);
  const save = (v) => { setAnalyticsConsent(v.analytics); storage.set(KEY, JSON.stringify(v)); setC({ status: 'decided', ...v }); };
  const reopen = () => setC((p) => ({ ...p, status: 'undecided' }));
  return <Ctx.Provider value={{ ...c, save, reopen }}>{children}</Ctx.Provider>;
}

export function ConsentSheet() {
  const s = useS(); const t = useTheme(); const c = useConsent();
  const [a, setA] = useState(c.analytics); const [m, setM] = useState(c.marketing);
  useEffect(() => { setA(c.analytics); setM(c.marketing); }, [c.status]);
  if (c.status !== 'undecided') return null;
  const row = (label, desc, val, set) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <View style={{ flex: 1 }}><Text style={s.name}>{label}</Text><Text style={s.muted}>{desc}</Text></View>
      {set ? <Switch value={val} onValueChange={set} trackColor={{ true: t.colors.primary }} /> : <Text style={s.muted}>Zawsze</Text>}
    </View>
  );
  return (
    <Sheet onClose={() => {}}>
      <Text style={s.h2}>Twoja prywatność</Text>
      <Text style={s.muted}>Powiadomienia o statusie zamówienia wysyłamy niezależnie od zgód. Resztą decydujesz Ty i zmienisz to w Koncie.</Text>
      {row('Niezbędne', 'Działanie zamówień, koszyka i logowania.', true, null)}
      {row('Statystyki', 'Anonimowe dane o korzystaniu z aplikacji.', a, setA)}
      {row('Marketing', 'Promocje i oferty od lokalu.', m, setM)}
      <View style={{ gap: 8, marginTop: 8 }}>
        <Button title="Akceptuj wszystkie" onPress={() => c.save({ analytics: true, marketing: true })} style={{ flex: 0 }} />
        <Button title="Zapisz mój wybór" ghost onPress={() => c.save({ analytics: a, marketing: m })} style={{ flex: 0 }} />
        <Button title="Tylko niezbędne" ghost onPress={() => c.save({ analytics: false, marketing: false })} style={{ flex: 0 }} />
      </View>
    </Sheet>
  );
}