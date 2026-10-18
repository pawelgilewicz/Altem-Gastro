import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Image, FlatList, ScrollView, Pressable, Modal, TextInput, Alert, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Anton_400Regular } from '@expo-google-fonts/anton';
import { BRAND } from './src/config';
import { getMenu, validateCart, createOrder, trackOrder } from './src/api';
import { CartProvider, useCart } from './src/cart';

const C = BRAND.colors;
const H = 'Anton_400Regular';
const zl = (minor) => `${(minor / 100).toFixed(2).replace('.', ',')} zł`;
const pick = (o, ...keys) => keys.map((k) => k.split('.').reduce((a, p) => (a == null ? a : a[p]), o)).find((v) => v != null);

function useMenu() {
  const [st, setSt] = useState({ status: 'loading' });
  const load = useCallback(() => {
    setSt({ status: 'loading' });
    getMenu().then((d) => setSt({ status: 'ready', categories: d.categories.filter((c) => c.active).sort((a, b) => a.sort_order - b.sort_order), products: d.products.filter((p) => p.active) }))
      .catch((e) => setSt({ status: 'error', message: e.message }));
  }, []);
  useEffect(load, [load]);
  return [st, load];
}

const Retry = ({ message, onRetry }) => (
  <View style={s.center}><Text style={s.h2}>Coś poszło nie tak</Text><Text style={[s.muted, { textAlign: 'center', marginHorizontal: 24 }]}>{message}</Text>
    <Pressable style={[s.cta, { flex: 0, paddingHorizontal: 28, marginTop: 16 }]} onPress={onRetry}><Text style={s.ctaTxt}>Spróbuj ponownie</Text></Pressable></View>
);

function ProductSheet({ product, onClose }) {
  const { dispatch } = useCart();
  const variants = [...product.variants].filter((v) => v.active).sort((a, b) => a.sort_order - b.sort_order);
  const [vid, setVid] = useState(variants[0] && variants[0].id);
  const [qty, setQty] = useState(1);
  const v = variants.find((x) => x.id === vid);
  const add = () => {
    const go = () => { dispatch({ type: 'add', productId: product.id, variantId: v.id, name: product.name, variantName: variants.length > 1 ? v.name : '', priceMinor: v.price_minor, qty }); onClose(); };
    if (product.tags.includes('18+')) Alert.alert('Produkt 18+', 'Potwierdzasz, że masz ukończone 18 lat?', [{ text: 'Anuluj', style: 'cancel' }, { text: 'Mam 18 lat', onPress: go }]);
    else go();
  };
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <Text style={s.h2}>{product.name}</Text>
        {!!product.description && <Text style={s.muted}>{product.description}</Text>}
        {variants.length > 1 && <Text style={s.label}>Wybierz wariant</Text>}
        {variants.length > 1 && variants.map((x) => (
          <Pressable key={x.id} onPress={() => setVid(x.id)} style={[s.opt, x.id === vid && { borderColor: C.accent }]}>
            <View style={[s.dot, x.id === vid && { backgroundColor: C.accent }]} /><Text style={s.optTxt}>{x.name}</Text><Text style={s.muted}>{zl(x.price_minor)}</Text>
          </Pressable>
        ))}
        <View style={s.sheetBar}>
          <Stepper qty={qty} onChange={(q) => setQty(Math.max(1, q))} />
          <Pressable style={s.cta} onPress={add}><Text style={s.ctaTxt}>Dodaj · {zl(v.price_minor * qty)}</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const Stepper = ({ qty, onChange }) => (
  <View style={s.qty}>
    <Pressable onPress={() => onChange(qty - 1)} style={s.qBtn}><Text style={s.qTxt}>−</Text></Pressable>
    <Text style={s.qNum}>{qty}</Text>
    <Pressable onPress={() => onChange(qty + 1)} style={s.qBtn}><Text style={s.qTxt}>+</Text></Pressable>
  </View>
);

function MenuScreen({ onPick }) {
  const [menu, reload] = useMenu();
  const [cat, setCat] = useState(null);
  if (menu.status === 'loading') return <View style={s.center}><ActivityIndicator color={C.accent} size="large" /></View>;
  if (menu.status === 'error') return <Retry message={menu.message} onRetry={reload} />;
  const active = cat || menu.categories[0].id;
  const data = menu.products.filter((p) => p.category_id === active);
  const header = (
    <View>
      <View style={s.hero}>
        <Image source={{ uri: BRAND.hero }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={s.heroShade} />
        <Text style={s.heroSub}>{BRAND.city}</Text>
        <Text style={s.heroTitle}>ALE YEAH!</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {menu.categories.map((c) => (
          <Pressable key={c.id} onPress={() => setCat(c.id)} style={[s.chip, active === c.id && s.chipOn]}><Text style={[s.chipTxt, active === c.id && { color: C.bg }]}>{c.name}</Text></Pressable>
        ))}
      </ScrollView>
    </View>
  );
  return (
    <FlatList data={data} keyExtractor={(p) => p.id} ListHeaderComponent={header} contentContainerStyle={{ paddingBottom: 24 }}
      renderItem={({ item }) => {
        const from = Math.min(...item.variants.filter((v) => v.active).map((v) => v.price_minor));
        return (
          <Pressable style={s.card} onPress={() => onPick(item)}>
            <View style={[s.thumb, s.ph]}><Text style={{ fontSize: 30 }}>{BRAND.emoji[item.category_id] || '🍽️'}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.name}</Text>
              {item.tags.length > 0 && <Text style={s.tag}>{item.tags.join(' · ')}</Text>}
              {!!item.description && <Text style={s.muted} numberOfLines={2}>{item.description}</Text>}
              <Text style={s.price}>{item.variants.length > 1 ? 'od ' : ''}{zl(from)}</Text>
            </View>
            <View style={s.plus}><Text style={s.plusTxt}>+</Text></View>
          </Pressable>
        );
      }} />
  );
}

function CartScreen({ onOrdered }) {
  const { lines, dispatch, estimateMinor } = useCart();
  const [mode, setMode] = useState('pickup');
  const [f, setF] = useState({ name: '', phone: '', addr: '' });
  const [quote, setQuote] = useState({ status: 'idle' });
  const [sending, setSending] = useState(false);

  useEffect(() => { // wycena i walidacja po stronie CORE
    if (!lines.length) return setQuote({ status: 'idle' });
    setQuote({ status: 'loading' });
    const t = setTimeout(() => validateCart(lines, mode)
      .then((d) => setQuote({ status: 'ok', totalMinor: pick(d, 'total_minor', 'totals.total_minor', 'summary.total_minor') }))
      .catch((e) => setQuote({ status: 'error', message: e.message })), 400);
    return () => clearTimeout(t);
  }, [lines, mode]);

  if (!lines.length) return <View style={s.center}><Text style={s.h2}>Koszyk jest pusty</Text><Text style={s.muted}>Wybierz coś z menu.</Text></View>;

  const submit = async () => {
    if (!f.name.trim() || f.phone.replace(/\D/g, '').length < 9 || (mode === 'delivery' && !f.addr.trim()))
      return Alert.alert('Uzupełnij dane', 'Podaj imię, telefon' + (mode === 'delivery' ? ' i adres dostawy.' : '.'));
    setSending(true);
    try {
      const o = await createOrder(lines, mode, { name: f.name.trim(), phone: f.phone.trim() }, f.addr.trim());
      const token = pick(o, 'tracking_token', 'token', 'order.tracking_token');
      dispatch({ type: 'clear' });
      onOrdered({ token, number: pick(o, 'order_number', 'number', 'order.order_number') });
    } catch (e) { Alert.alert('Nie udało się złożyć zamówienia', e.message); }
    setSending(false);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={s.h2}>Twoje zamówienie</Text>
      {lines.map((l) => (
        <View key={l.key} style={s.line}>
          <View style={{ flex: 1 }}><Text style={s.name}>{l.name}</Text>{!!l.variantName && <Text style={s.muted}>{l.variantName}</Text>}</View>
          <Stepper qty={l.qty} onChange={(q) => dispatch({ type: 'qty', key: l.key, qty: q })} />
        </View>
      ))}
      <Text style={s.label}>Odbiór czy dostawa?</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[['pickup', 'Odbiór osobisty'], ['delivery', 'Dostawa']].map(([k, t]) => (
          <Pressable key={k} onPress={() => setMode(k)} style={[s.chip, { flex: 1, alignItems: 'center' }, mode === k && s.chipOn]}><Text style={[s.chipTxt, mode === k && { color: C.bg }]}>{t}</Text></Pressable>
        ))}
      </View>
      <TextInput style={s.input} placeholder="Imię" placeholderTextColor={C.muted} value={f.name} onChangeText={(v) => setF({ ...f, name: v })} />
      <TextInput style={s.input} placeholder="Telefon" placeholderTextColor={C.muted} keyboardType="phone-pad" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} />
      {mode === 'delivery' && <TextInput style={s.input} placeholder="Adres dostawy" placeholderTextColor={C.muted} value={f.addr} onChangeText={(v) => setF({ ...f, addr: v })} />}
      <View style={s.sum}>
        <Text style={s.h2}>Razem</Text>
        {quote.status === 'loading' ? <ActivityIndicator color={C.accent} /> : <Text style={s.h2}>{quote.status === 'ok' && quote.totalMinor != null ? zl(quote.totalMinor) : `~ ${zl(estimateMinor)}`}</Text>}
      </View>
      <Text style={s.muted}>{quote.status === 'ok' ? 'Cena potwierdzona przez serwer.' : quote.status === 'error' ? quote.message : 'Ostateczną cenę wylicza serwer.'}</Text>
      <Pressable style={[s.cta, { marginTop: 16 }, (quote.status !== 'ok' || sending) && { opacity: 0.4 }]} disabled={quote.status !== 'ok' || sending} onPress={submit}>
        {sending ? <ActivityIndicator color={C.bg} /> : <Text style={s.ctaTxt}>Złóż zamówienie</Text>}
      </Pressable>
    </ScrollView>
  );
}

function StatusScreen({ order }) {
  const [st, setSt] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    if (!order || !order.token) return;
    let alive = true;
    const poll = () => trackOrder(order.token).then((d) => alive && (setSt(pick(d, 'status', 'order.status') || '—'), setErr(null))).catch((e) => alive && setErr(e.message));
    poll();
    const id = setInterval(poll, 15000);
    return () => { alive = false; clearInterval(id); };
  }, [order]);
  if (!order) return <View style={s.center}><Text style={s.h2}>Brak aktywnego zamówienia</Text><Text style={s.muted}>Po złożeniu zamówienia zobaczysz tu jego status.</Text></View>;
  return (
    <View style={s.center}>
      <Text style={s.muted}>Zamówienie {order.number ? `nr ${order.number}` : ''}</Text>
      <Text style={[s.heroTitle, { fontSize: 44, color: C.accent }]}>{st || '…'}</Text>
      {!!err && <Text style={[s.muted, { textAlign: 'center', marginHorizontal: 24 }]}>{err}</Text>}
      {!order.token && <Text style={s.muted}>Serwer nie zwrócił tokenu śledzenia.</Text>}
    </View>
  );
}

function Shell() {
  const insets = useSafeAreaInsets();
  const { count } = useCart();
  const [tab, setTab] = useState('menu');
  const [picked, setPicked] = useState(null);
  const [order, setOrder] = useState(null);
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <View style={s.top}><Image source={{ uri: BRAND.logo }} style={s.logo} resizeMode="contain" /><Text style={s.muted}>{BRAND.city}</Text></View>
      <View style={{ flex: 1 }}>
        {tab === 'menu' && <MenuScreen onPick={setPicked} />}
        {tab === 'cart' && <CartScreen onOrdered={(o) => { setOrder(o); setTab('status'); }} />}
        {tab === 'status' && <StatusScreen order={order} />}
      </View>
      <View style={[s.tabs, { paddingBottom: insets.bottom + 8 }]}>
        {[['menu', '🍔', 'Menu'], ['cart', '🛒', count ? `Koszyk (${count})` : 'Koszyk'], ['status', '🧾', 'Status']].map(([k, i, t]) => (
          <Pressable key={k} style={s.tab} onPress={() => setTab(k)}><Text style={{ fontSize: 20, opacity: tab === k ? 1 : 0.5 }}>{i}</Text><Text style={[s.tabTxt, tab === k && { color: C.accent }]}>{t}</Text></Pressable>
        ))}
      </View>
      {picked && <ProductSheet key={picked.id} product={picked} onClose={() => setPicked(null)} />}
    </View>
  );
}

export default function App() {
  const [ok] = useFonts({ Anton_400Regular });
  if (!ok) return null;
  return <SafeAreaProvider><CartProvider><Shell /></CartProvider></SafeAreaProvider>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 52, borderBottomWidth: 1, borderColor: C.line },
  logo: { width: 110, height: 36 },
  hero: { margin: 16, borderRadius: 20, overflow: 'hidden', padding: 20, minHeight: 170, justifyContent: 'flex-end', backgroundColor: C.card },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(22,17,14,0.55)' },
  heroSub: { color: C.accent, fontSize: 14, fontWeight: '600' }, heroTitle: { color: C.text, fontFamily: H, fontSize: 56, lineHeight: 62 },
  chips: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  chip: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 99, borderWidth: 1, borderColor: C.line },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent }, chipTxt: { color: C.text, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 10, padding: 10, borderRadius: 16, backgroundColor: C.card },
  thumb: { width: 64, height: 64, borderRadius: 12 }, ph: { backgroundColor: C.line, alignItems: 'center', justifyContent: 'center' },
  tag: { color: C.hot, fontWeight: '700', fontSize: 12 }, name: { color: C.text, fontSize: 17, fontWeight: '700' }, muted: { color: C.muted, fontSize: 13, marginTop: 2 },
  price: { color: C.accent, fontFamily: H, fontSize: 20, marginTop: 4 },
  plus: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.hot, alignItems: 'center', justifyContent: 'center' }, plusTxt: { color: '#fff', fontSize: 22, marginTop: -2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16 }, sheetBar: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingTop: 16 },
  h2: { color: C.text, fontFamily: H, fontSize: 26, marginTop: 4 }, label: { color: C.text, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 6, borderRadius: 12, borderWidth: 1, borderColor: C.line },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: C.muted }, optTxt: { flex: 1, color: C.text, fontSize: 15 },
  qty: { flexDirection: 'row', alignItems: 'center', gap: 10 }, qBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  qTxt: { color: C.text, fontSize: 20 }, qNum: { color: C.text, fontSize: 16, minWidth: 18, textAlign: 'center' },
  cta: { flex: 1, backgroundColor: C.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center' }, ctaTxt: { color: C.bg, fontWeight: '800', fontSize: 16 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: C.line },
  input: { marginTop: 10, padding: 14, borderRadius: 12, backgroundColor: C.card, color: C.text, fontSize: 15 },
  sum: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderColor: C.line, backgroundColor: C.card, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', gap: 2 }, tabTxt: { color: C.muted, fontSize: 12, fontWeight: '600' },
});