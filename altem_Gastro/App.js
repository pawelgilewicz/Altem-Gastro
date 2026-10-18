import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Image, FlatList, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, Linking, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from '@expo-google-fonts/anton';
import { TENANT } from './src/config';
import { ThemeProvider, useTheme } from './src/theme';
import { getVenue, getVenueStatus, getMenu, validateCart, createOrder, trackOrder } from './src/api';
import { CartProvider, useCart } from './src/cart';
import { track, pick } from './src/services';
import { AuthProvider, useAuth, AuthForm } from './src/auth';
import { ConsentProvider, ConsentSheet, useConsent } from './src/consent';
import { useS, zl, Button, CategoryChip, Stepper, Sheet, Option, ModifierGroup, StatusTimeline, BottomNav } from './src/ui';

const M = TENANT.modules;

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
function useVenue() {
  const [v, setV] = useState({ status: 'loading' });
  const load = useCallback(() => {
    setV({ status: 'loading' });
    Promise.allSettled([getVenue(), getVenueStatus()]).then(([a, b]) => (a.status === 'fulfilled'
      ? setV({ status: 'ready', venue: a.value, st: b.status === 'fulfilled' ? b.value : null }) // status opcjonalny
      : setV({ status: 'error', message: a.reason.message })));
  }, []);
  useEffect(load, [load]);
  return [v, load];
}

const Retry = ({ message, onRetry }) => { const s = useS(); return <View style={s.center}><Text style={s.h2}>Coś poszło nie tak</Text><Text style={[s.muted, { textAlign: 'center' }]}>{message}</Text><Button title="Spróbuj ponownie" onPress={onRetry} style={{ flex: 0, paddingHorizontal: 28, marginTop: 12 }} /></View>; };

function HomeScreen({ go, setChannel }) {
  const s = useS(); const t = useTheme(); const [v, reload] = useVenue();
  const open = v.status === 'ready' ? (pick(v.st, 'open_now', 'is_open', 'open') ?? pick(v.venue, 'open_now', 'is_open')) : null; // ZAŁOŻONE nazwy pól
  const start = (ch) => { setChannel(ch); track('home_cta_click', { channel: ch }); go('menu'); };
  return (
    <ScrollView>
      <View style={{ margin: 16, borderRadius: t.radius.lg, overflow: 'hidden', padding: 20, minHeight: 200, justifyContent: 'flex-end', backgroundColor: t.colors.surface }}>
        <Image source={{ uri: TENANT.assets.hero }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
        <Text style={[s.h1, { fontSize: 44, color: t.colors.onPrimary }]}>{pick(v.venue, 'name', 'venue.name') || TENANT.name}</Text>
        {open != null && <Text style={{ color: open ? t.colors.primary : t.colors.secondary, fontWeight: '700' }}>{open ? 'Otwarte' : 'Zamknięte'}</Text>}
      </View>
      {v.status === 'error' && <Pressable onPress={reload}><Text style={[s.muted, { marginHorizontal: 16 }]}>Nie pobrano statusu lokalu. Dotknij, aby ponowić.</Text></Pressable>}
      <View style={{ padding: 16, gap: 10 }}>
        {M.delivery && <Button title="Dostawa" onPress={() => start('delivery')} style={{ flex: 0 }} />}
        {M.pickup && <Button title="Odbiór osobisty" onPress={() => start('pickup')} ghost style={{ flex: 0 }} />}
      </View>
    </ScrollView>
  );
}

function ProductSheet({ product, onClose }) {
  const s = useS(); const { dispatch } = useCart();
  const variants = product.variants.filter((v) => v.active).sort((a, b) => a.sort_order - b.sort_order);
  const groups = product.option_groups || [];
  const [vid, setVid] = useState(variants[0] && variants[0].id);
  const [qty, setQty] = useState(1);
  const [sel, setSel] = useState({});
  useEffect(() => track('product_view', { product_id: product.id }), [product.id]);
  const v = variants.find((x) => x.id === vid);
  const need = (g) => g.min_select || (g.required ? 1 : 0);
  const toggle = (g, oid) => setSel((p) => {
    const cur = p[g.id] || [];
    if (cur.includes(oid)) return { ...p, [g.id]: cur.filter((x) => x !== oid) };
    if (g.max_select === 1) return { ...p, [g.id]: [oid] };
    return g.max_select && cur.length >= g.max_select ? p : { ...p, [g.id]: [...cur, oid] };
  });
  const picked = groups.flatMap((g) => (sel[g.id] || []).map((id) => g.options.find((o) => o.id === id)));
  const unit = v.price_minor + picked.reduce((a, o) => a + (o.price_minor || 0), 0);
  const ok = groups.every((g) => (sel[g.id] || []).length >= need(g));
  const add = () => {
    const go = () => { dispatch({ type: 'add', productId: product.id, variantId: v.id, name: product.name, variantName: variants.length > 1 ? v.name : '', modifiers: picked.map((o) => o.id), modNames: picked.map((o) => o.name), priceMinor: unit, qty }); track('add_to_cart', { product_id: product.id }); onClose(); };
    if (product.tags.includes('18+')) Alert.alert('Produkt 18+', 'Potwierdzasz, że masz ukończone 18 lat?', [{ text: 'Anuluj', style: 'cancel' }, { text: 'Mam 18 lat', onPress: go }]); else go();
  };
  return (
    <Sheet onClose={onClose}>
      <ScrollView>
        <Text style={s.h2}>{product.name}</Text>
        {!!product.description && <Text style={s.muted}>{product.description}</Text>}
        {variants.length > 1 && <Text style={s.label}>Wybierz wariant</Text>}
        {variants.length > 1 && variants.map((x) => <Option key={x.id} on={x.id === vid} text={x.name} price={0} onPress={() => setVid(x.id)} />)}
        {groups.map((g) => <ModifierGroup key={g.id} group={g} selected={sel[g.id] || []} onToggle={toggle} />)}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingTop: 16 }}>
        <Stepper qty={qty} onChange={(q) => setQty(Math.max(1, q))} />
        <Button title={`Dodaj · ${zl(unit * qty)}`} onPress={add} disabled={!ok} />
      </View>
    </Sheet>
  );
}

function MenuScreen({ onPick }) {
  const s = useS(); const t = useTheme(); const [menu, reload] = useMenu();
  const [cat, setCat] = useState(null); const [query, setQuery] = useState('');
  useEffect(() => track('menu_view'), []);
  if (menu.status === 'loading') return <View style={s.center}><ActivityIndicator color={t.colors.primary} size="large" /></View>;
  if (menu.status === 'error') return <Retry message={menu.message} onRetry={reload} />;
  const active = cat || menu.categories[0].id; const qn = query.trim().toLowerCase();
  const data = qn ? menu.products.filter((p) => (p.name + ' ' + p.description).toLowerCase().includes(qn)) : menu.products.filter((p) => p.category_id === active);
  const header = (
    <View>
      <TextInput style={[s.input, { marginHorizontal: 16 }]} placeholder="Szukaj w menu" placeholderTextColor={t.colors.muted} value={query} onChangeText={setQuery} />
      {!qn && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 8 }}>
        {menu.categories.map((c) => <CategoryChip key={c.id} label={c.name} on={active === c.id} onPress={() => setCat(c.id)} />)}
      </ScrollView>}
    </View>
  );
  return (
    <FlatList data={data} keyExtractor={(p) => p.id} ListHeaderComponent={header} contentContainerStyle={{ paddingBottom: 90 }}
      ListEmptyComponent={<Text style={[s.muted, { textAlign: 'center', marginTop: 24 }]}>Brak wyników dla „{query}".</Text>}
      renderItem={({ item }) => {
        const from = Math.min(...item.variants.filter((v) => v.active).map((v) => v.price_minor));
        return (
          <Pressable style={s.card} onPress={() => onPick(item)}>
            <View style={s.thumb}><Text style={{ fontSize: 30 }}>{TENANT.icons[item.category_id] || '🍽️'}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.name}</Text>
              {item.tags.length > 0 && <Text style={s.tag}>{item.tags.join(' · ')}</Text>}
              {!!item.description && <Text style={s.muted} numberOfLines={2}>{item.description}</Text>}
              <Text style={s.price}>{item.variants.length > 1 ? 'od ' : ''}{zl(from)}</Text>
            </View>
          </Pressable>
        );
      }} />
  );
}

function CartScreen({ channel, setChannel, onOrdered, onBack }) {
  const s = useS(); const t = useTheme(); const { lines, dispatch, estimateMinor } = useCart();
  const { user } = useAuth();
  const [f, setF] = useState({ name: pick(user, 'name', 'full_name') || '', phone: pick(user, 'phone') || '', addr: '' });
  const [quote, setQuote] = useState({ status: 'idle' });
  const [sending, setSending] = useState(false);
  const idem = useRef(null);
  useEffect(() => { track('checkout_started'); }, []);
  useEffect(() => {
    idem.current = null; // zmiana koszyka = nowe zamówienie = nowy klucz idempotencji
    if (!lines.length) return setQuote({ status: 'idle' });
    setQuote({ status: 'loading' });
    const id = setTimeout(() => validateCart(lines, channel)
      .then((d) => setQuote({ status: 'ok', totalMinor: pick(d, 'total_minor', 'totals.total_minor', 'summary.total_minor') }))
      .catch((e) => setQuote({ status: 'error', message: e.message })), 400);
    return () => clearTimeout(id);
  }, [lines, channel]);

  const header = <Pressable onPress={onBack}><Text style={[s.muted, { padding: 16 }]}>‹ Wróć do menu</Text></Pressable>;
  if (!lines.length) return <View style={{ flex: 1 }}>{header}<View style={s.center}><Text style={s.h2}>Koszyk jest pusty</Text></View></View>;

  const submit = async () => {
    if (!f.name.trim() || f.phone.replace(/\D/g, '').length < 9 || (channel === 'delivery' && !f.addr.trim()))
      return Alert.alert('Uzupełnij dane', 'Podaj imię, telefon' + (channel === 'delivery' ? ' i adres dostawy.' : '.'));
    setSending(true);
    try {
      idem.current = idem.current || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      const o = await createOrder(lines, channel, { name: f.name.trim(), phone: f.phone.trim() }, f.addr.trim(), idem.current);
      track('order_created');
      dispatch({ type: 'clear' });
      onOrdered({ token: pick(o, 'tracking_token', 'token', 'order.tracking_token'), number: pick(o, 'order_number', 'number', 'order.order_number') });
    } catch (e) { Alert.alert('Nie udało się złożyć zamówienia', e.message + '\n\nMożesz spróbować ponownie – nie utworzymy duplikatu.'); }
    setSending(false);
  };
  const ch = [M.pickup && ['pickup', 'Odbiór'], M.delivery && ['delivery', 'Dostawa']].filter(Boolean);
  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      {header}
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={s.h2}>Twoje zamówienie</Text>
        {lines.map((l) => (
          <View key={l.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: t.colors.border }}>
            <View style={{ flex: 1 }}><Text style={s.name}>{l.name}</Text>{!!(l.variantName || l.modNames.length) && <Text style={s.muted}>{[l.variantName, ...l.modNames].filter(Boolean).join(', ')}</Text>}</View>
            <Stepper qty={l.qty} onChange={(q) => dispatch({ type: 'qty', key: l.key, qty: q })} />
          </View>
        ))}
        <Text style={s.label}>Realizacja</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>{ch.map(([k, name]) => <CategoryChip key={k} label={name} on={channel === k} onPress={() => setChannel(k)} style={{ flex: 1, alignItems: 'center' }} />)}</View>
        <TextInput style={s.input} placeholder="Imię" placeholderTextColor={t.colors.muted} value={f.name} onChangeText={(v) => setF({ ...f, name: v })} />
        <TextInput style={s.input} placeholder="Telefon" placeholderTextColor={t.colors.muted} keyboardType="phone-pad" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} />
        {channel === 'delivery' && <TextInput style={s.input} placeholder="Adres dostawy" placeholderTextColor={t.colors.muted} value={f.addr} onChangeText={(v) => setF({ ...f, addr: v })} />}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <Text style={s.h2}>Razem</Text>
          {quote.status === 'loading' ? <ActivityIndicator color={t.colors.primary} /> : <Text style={s.h2}>{quote.status === 'ok' && quote.totalMinor != null ? zl(quote.totalMinor) : `~ ${zl(estimateMinor)}`}</Text>}
        </View>
        <Text style={s.muted}>{quote.status === 'ok' ? 'Cena potwierdzona przez serwer.' : quote.status === 'error' ? quote.message : 'Ostateczną cenę, dostawę i rabaty wylicza serwer.'}</Text>
        <Button title="Złóż zamówienie" onPress={submit} loading={sending} disabled={quote.status !== 'ok'} style={{ flex: 0, marginTop: 16, marginBottom: 32 }} />
      </View>
    </ScrollView>
  );
}

function OrdersScreen({ order }) {
  const s = useS(); const [st, setSt] = useState(null); const [err, setErr] = useState(null);
  useEffect(() => {
    if (!order || !order.token) return;
    let alive = true;
    const poll = () => trackOrder(order.token).then((d) => alive && (setSt(pick(d, 'status', 'order.status') || null), setErr(null))).catch((e) => alive && setErr(e.message));
    poll(); const id = setInterval(poll, 15000);
    return () => { alive = false; clearInterval(id); };
  }, [order]);
  if (!order) return <View style={s.center}><Text style={s.h2}>Brak aktywnego zamówienia</Text><Text style={s.muted}>Po złożeniu zamówienia zobaczysz tu jego status.</Text></View>;
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={s.h2}>Zamówienie {order.number ? `nr ${order.number}` : ''}</Text>
      {!order.token && <Text style={s.muted}>Serwer nie zwrócił tokenu śledzenia.</Text>}
      {!!err && <Text style={s.muted}>{err}</Text>}
      <View style={{ marginTop: 16 }}>{st ? <StatusTimeline status={st} /> : <ActivityIndicator />}</View>
    </ScrollView>
  );
}

function AccountScreen() {
  const s = useS(); const { status, user, signOut } = useAuth(); const consent = useConsent(); const [view, setView] = useState('main');
  if (view === 'auth') return <AuthForm onDone={() => setView('main')} onBack={() => setView('main')} />;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
      <Text style={s.h2}>Konto</Text>
      {status === 'authed' ? (
        <>
          <Text style={s.name}>{pick(user, 'name', 'full_name') || 'Zalogowany'}</Text>
          <Text style={s.muted}>{pick(user, 'email')}</Text>
          <Text style={s.muted}>Historia zamówień, adresy i ulubione: TODO INTEGRATION.</Text>
          <Button title="Wyloguj" ghost onPress={signOut} style={{ flex: 0, marginTop: 12 }} />
        </>
      ) : (
        <>
          <Text style={s.muted}>Zamawiasz jako gość. Konto zapamięta Twoje dane przy kolejnych zamówieniach.</Text>
          <Button title="Zaloguj się lub załóż konto" onPress={() => setView('auth')} style={{ flex: 0, marginTop: 12 }} />
        </>
      )}
      <Text style={[s.label, { marginTop: 24 }]}>Prywatność</Text>
      <Button title="Zgody i ciasteczka" ghost onPress={consent.reopen} style={{ flex: 0 }} />
      <Text style={[s.name, { marginTop: 24 }]}>{TENANT.name}</Text>
      <Text style={s.muted}>{TENANT.address}</Text>
      <Button title={`Zadzwoń: ${TENANT.phone}`} ghost onPress={() => Linking.openURL(`tel:${TENANT.phone}`)} style={{ flex: 0, marginTop: 8 }} />
    </ScrollView>
  );
}

function Shell() {
  const s = useS(); const insets = useSafeAreaInsets(); const t = useTheme(); const { count, estimateMinor } = useCart();
  const [tab, setTab] = useState('home');
  const [channel, setChannel] = useState(M.pickup ? 'pickup' : 'delivery');
  const [picked, setPicked] = useState(null);
  const [order, setOrder] = useState(null);
  useEffect(() => track('app_open'), []);
  const tabs = [['home', '🏠', 'Start'], ['menu', '🍔', 'Menu'], ['orders', '🧾', 'Zamówienia'], M.loyalty && ['rewards', '⭐', 'Nagrody'], ['account', '👤', 'Konto']].filter(Boolean);
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle={t.statusBar} />
      <View style={{ flex: 1 }}>
        {tab === 'home' && <HomeScreen go={setTab} setChannel={setChannel} />}
        {tab === 'menu' && <MenuScreen onPick={setPicked} />}
        {tab === 'cart' && <CartScreen channel={channel} setChannel={setChannel} onBack={() => setTab('menu')} onOrdered={(o) => { setOrder(o); setTab('orders'); }} />}
        {tab === 'orders' && <OrdersScreen order={order} />}
        {tab === 'account' && <AccountScreen />}
      </View>
      {count > 0 && tab !== 'cart' && (
        <Pressable onPress={() => setTab('cart')} style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 72, backgroundColor: t.colors.primary, borderRadius: t.radius.md, padding: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={s.btnTxt}>Koszyk ({count})</Text><Text style={s.btnTxt}>~ {zl(estimateMinor)}</Text>
        </Pressable>
      )}
      <BottomNav tabs={tabs} active={tab} onChange={setTab} bottomInset={insets.bottom} />
      <ConsentSheet />
      {picked && <ProductSheet key={picked.id} product={picked} onClose={() => setPicked(null)} />}
    </View>
  );
}

export default function App() {
  const [ok] = useFonts(TENANT.fonts);
  if (!ok) return null;
  return <SafeAreaProvider><ThemeProvider><ConsentProvider><AuthProvider><CartProvider><Shell /></CartProvider></AuthProvider></ConsentProvider></ThemeProvider></SafeAreaProvider>;
}