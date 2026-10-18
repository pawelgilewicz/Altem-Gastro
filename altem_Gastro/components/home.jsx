import React, { useState, useMemo } from 'react';
import { View, Text, Image, FlatList, ScrollView, Pressable, Modal, TextInput, Alert, Linking, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Anton_400Regular } from '@expo-google-fonts/anton';
import { IMG, CATS, EMOJI, MENU, EXTRAS, SET_PRICE, DELIVERY_FEE } from './data';

const C = { bg: '#16110E', card: '#231B16', line: '#3A2E26', mustard: '#FFB81C', red: '#E8401C', text: '#F6EDE0', muted: '#A39687' };
const H = 'Anton_400Regular';
const zl = (n) => `${n.toFixed(2).replace('.', ',')} zł`;

function Pic({ uri, emoji, style }) {
  const [err, setErr] = useState(false);
  if (!uri || err) return <View style={[style, s.ph]}><Text style={{ fontSize: 38 }}>{emoji}</Text></View>;
  return <Image source={{ uri }} style={style} resizeMode="cover" onError={() => setErr(true)} />;
}

function ProductSheet({ item, onClose, onAdd }) {
  const isBurger = item.cat === 'Burgery';
  const [set, setSet] = useState(false);
  const [ex, setEx] = useState([]);
  const [qty, setQty] = useState(1);
  const unit = item.price + (set ? SET_PRICE : 0) + ex.reduce((a, id) => a + EXTRAS.find((e) => e.id === id).price, 0);
  const toggle = (id) => setEx((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <ScrollView>
          <Pic uri={item.img} emoji={EMOJI[item.cat]} style={s.sheetImg} />
          <Text style={s.h2}>{item.name}</Text>
          {!!item.desc && <Text style={s.muted}>{item.desc}</Text>}
          {isBurger && (
            <>
              <Text style={s.label}>Wariant</Text>
              <Opt on={!set} text="Sam burger" onPress={() => setSet(false)} />
              <Opt on={set} text="Zestaw: frytki + napój" price={SET_PRICE} onPress={() => setSet(true)} />
              <Text style={s.label}>Dodatki</Text>
              {EXTRAS.map((e) => <Opt key={e.id} on={ex.includes(e.id)} text={e.name} price={e.price} onPress={() => toggle(e.id)} />)}
            </>
          )}
        </ScrollView>
        <View style={s.sheetBar}>
          <View style={s.qty}>
            <Pressable onPress={() => setQty(Math.max(1, qty - 1))} style={s.qBtn}><Text style={s.qTxt}>−</Text></Pressable>
            <Text style={s.qNum}>{qty}</Text>
            <Pressable onPress={() => setQty(qty + 1)} style={s.qBtn}><Text style={s.qTxt}>+</Text></Pressable>
          </View>
          <Pressable style={s.cta} onPress={() => onAdd({ item, set, ex, qty, unit })}>
            <Text style={s.ctaTxt}>Dodaj · {zl(unit * qty)}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const Opt = ({ on, text, price, onPress }) => (
  <Pressable onPress={onPress} style={[s.opt, on && { borderColor: C.mustard }]}>
    <View style={[s.dot, on && { backgroundColor: C.mustard }]} />
    <Text style={s.optTxt}>{text}</Text>
    {!!price && <Text style={s.muted}>+{zl(price)}</Text>}
  </Pressable>
);

function MenuScreen({ onPick }) {
  const [cat, setCat] = useState('Wszystkie');
  const data = cat === 'Wszystkie' ? MENU : MENU.filter((m) => m.cat === cat);
  const header = (
    <View>
      <View style={s.hero}>
        <Image source={{ uri: IMG.hero }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={s.heroShade} />
        <Text style={s.heroSub}>Burgerownia z charakterem</Text>
        <Text style={s.heroTitle}>ALE YEAH!</Text>
        <Text style={s.heroTxt}>Prawdziwe burgery. Konkretne smaki. Bez udawania.</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {['Wszystkie', ...CATS].map((c) => (
          <Pressable key={c} onPress={() => setCat(c)} style={[s.chip, cat === c && s.chipOn]}>
            <Text style={[s.chipTxt, cat === c && { color: C.bg }]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
  return (
    <FlatList data={data} keyExtractor={(i) => i.id} ListHeaderComponent={header}
      contentContainerStyle={{ paddingBottom: 24 }}
      renderItem={({ item }) => (
        <Pressable style={s.card} onPress={() => onPick(item)}>
          <Pic uri={item.img} emoji={EMOJI[item.cat]} style={s.thumb} />
          <View style={{ flex: 1 }}>
            {item.hit && <Text style={s.hit}>Bestseller</Text>}
            <Text style={s.name}>{item.name}</Text>
            {!!item.desc && <Text style={s.muted} numberOfLines={2}>{item.desc}</Text>}
            <Text style={s.price}>{zl(item.price)}</Text>
          </View>
          <View style={s.plus}><Text style={s.plusTxt}>+</Text></View>
        </Pressable>
      )} />
  );
}

function CartScreen({ cart, setQty, onDone }) {
  const [mode, setMode] = useState('pickup');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addr, setAddr] = useState('');
  const sub = cart.reduce((a, l) => a + l.unit * l.qty, 0);
  const fee = mode === 'delivery' && cart.length ? DELIVERY_FEE : 0;
  if (!cart.length) return <View style={s.empty}><Text style={s.h2}>Koszyk jest pusty</Text><Text style={s.muted}>Wybierz burgera w zakładce Menu.</Text></View>;
  const submit = () => {
    if (!name.trim() || phone.replace(/\D/g, '').length < 9 || (mode === 'delivery' && !addr.trim()))
      return Alert.alert('Uzupełnij dane', 'Podaj imię, numer telefonu' + (mode === 'delivery' ? ' i adres dostawy.' : '.'));
    Alert.alert('Zamówienie przyjęte', `Dziękujemy, ${name.trim()}! Zadzwonimy na ${phone}, gdy będzie gotowe.`);
    onDone();
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={s.h2}>Twoje zamówienie</Text>
      {cart.map((l) => (
        <View key={l.key} style={s.line}>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{l.item.name}</Text>
            <Text style={s.muted}>{[l.set && 'Zestaw', ...l.ex.map((id) => EXTRAS.find((e) => e.id === id).name)].filter(Boolean).join(', ') || 'Bez zmian'}</Text>
            <Text style={s.price}>{zl(l.unit * l.qty)}</Text>
          </View>
          <View style={s.qty}>
            <Pressable onPress={() => setQty(l.key, l.qty - 1)} style={s.qBtn}><Text style={s.qTxt}>−</Text></Pressable>
            <Text style={s.qNum}>{l.qty}</Text>
            <Pressable onPress={() => setQty(l.key, l.qty + 1)} style={s.qBtn}><Text style={s.qTxt}>+</Text></Pressable>
          </View>
        </View>
      ))}
      <Text style={s.label}>Odbiór czy dostawa?</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[['pickup', 'Odbiór osobisty'], ['delivery', `Dostawa +${zl(DELIVERY_FEE)}`]].map(([k, t]) => (
          <Pressable key={k} onPress={() => setMode(k)} style={[s.chip, { flex: 1, alignItems: 'center' }, mode === k && s.chipOn]}>
            <Text style={[s.chipTxt, mode === k && { color: C.bg }]}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={s.input} placeholder="Imię" placeholderTextColor={C.muted} value={name} onChangeText={setName} />
      <TextInput style={s.input} placeholder="Telefon" placeholderTextColor={C.muted} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      {mode === 'delivery' && <TextInput style={s.input} placeholder="Adres dostawy" placeholderTextColor={C.muted} value={addr} onChangeText={setAddr} />}
      <View style={s.sum}><Text style={s.muted}>Dostawa</Text><Text style={s.optTxt}>{zl(fee)}</Text></View>
      <View style={s.sum}><Text style={s.h2}>Razem</Text><Text style={s.h2}>{zl(sub + fee)}</Text></View>
      <Pressable style={s.cta} onPress={submit}><Text style={s.ctaTxt}>Złóż zamówienie</Text></Pressable>
    </ScrollView>
  );
}

function InfoScreen() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={s.h2}>Brzeg Dolny</Text>
      <Text style={s.muted}>Aleje Jerozolimskie 43, 56-120 Brzeg Dolny</Text>
      <Pressable style={[s.cta, { marginTop: 20 }]} onPress={() => Linking.openURL('tel:782453111')}><Text style={s.ctaTxt}>Zadzwoń: 782 453 111</Text></Pressable>
      <Pressable style={[s.cta, s.ghost]} onPress={() => Linking.openURL('https://maps.google.com/?q=Aleje+Jerozolimskie+43+Brzeg+Dolny')}><Text style={[s.ctaTxt, { color: C.mustard }]}>Pokaż na mapie</Text></Pressable>
      <Text style={[s.muted, { marginTop: 24 }]}>Ale Yeah! Burger · powered by ALTEM GASTRO</Text>
    </ScrollView>
  );
}

function Shell() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('menu');
  const [cart, setCart] = useState([]);
  const [picked, setPicked] = useState(null);
  const count = useMemo(() => cart.reduce((a, l) => a + l.qty, 0), [cart]);

  const add = ({ item, set, ex, qty, unit }) => {
    const key = [item.id, set, [...ex].sort().join('+')].join('|');
    setCart((p) => (p.some((l) => l.key === key) ? p.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l)) : [...p, { key, item, set, ex, qty, unit }]));
    setPicked(null);
  };
  const setQty = (key, q) => setCart((p) => (q < 1 ? p.filter((l) => l.key !== key) : p.map((l) => (l.key === key ? { ...l, qty: q } : l))));

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <View style={s.top}>
        <Image source={{ uri: IMG.logo }} style={s.logo} resizeMode="contain" />
        <Text style={s.topTxt}>Brzeg Dolny</Text>
      </View>
      <View style={{ flex: 1 }}>
        {tab === 'menu' && <MenuScreen onPick={setPicked} />}
        {tab === 'cart' && <CartScreen cart={cart} setQty={setQty} onDone={() => { setCart([]); setTab('menu'); }} />}
        {tab === 'info' && <InfoScreen />}
      </View>
      <View style={[s.tabs, { paddingBottom: insets.bottom + 8 }]}>
        {[['menu', '🍔', 'Menu'], ['cart', '🛒', count ? `Koszyk (${count})` : 'Koszyk'], ['info', '📍', 'Lokal']].map(([k, i, t]) => (
          <Pressable key={k} style={s.tab} onPress={() => setTab(k)}>
            <Text style={{ fontSize: 20, opacity: tab === k ? 1 : 0.5 }}>{i}</Text>
            <Text style={[s.tabTxt, tab === k && { color: C.mustard }]}>{t}</Text>
          </Pressable>
        ))}
      </View>
      {picked && <ProductSheet key={picked.id} item={picked} onClose={() => setPicked(null)} onAdd={add} />}
    </View>
  );
}

export default function App() {
  const [ok] = useFonts({ Anton_400Regular });
  if (!ok) return null;
  return <SafeAreaProvider><Shell /></SafeAreaProvider>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 52, borderBottomWidth: 1, borderColor: C.line },
  logo: { width: 110, height: 36 }, topTxt: { color: C.muted, fontSize: 13 },
  hero: { margin: 16, borderRadius: 20, overflow: 'hidden', padding: 20, minHeight: 210, justifyContent: 'flex-end', backgroundColor: C.card },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(22,17,14,0.55)' },
  heroSub: { color: C.mustard, fontSize: 14, fontWeight: '600' },
  heroTitle: { color: C.text, fontFamily: H, fontSize: 56, lineHeight: 62 },
  heroTxt: { color: C.text, fontSize: 14, marginTop: 2 },
  chips: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  chip: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 99, borderWidth: 1, borderColor: C.line },
  chipOn: { backgroundColor: C.mustard, borderColor: C.mustard }, chipTxt: { color: C.text, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 10, padding: 10, borderRadius: 16, backgroundColor: C.card },
  thumb: { width: 92, height: 92, borderRadius: 12 }, ph: { backgroundColor: C.line, alignItems: 'center', justifyContent: 'center' },
  hit: { color: C.red, fontWeight: '700', fontSize: 12 },
  name: { color: C.text, fontSize: 17, fontWeight: '700' }, muted: { color: C.muted, fontSize: 13, marginTop: 2 },
  price: { color: C.mustard, fontFamily: H, fontSize: 20, marginTop: 4 },
  plus: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  plusTxt: { color: '#fff', fontSize: 22, marginTop: -2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { maxHeight: '85%', backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16 },
  sheetImg: { width: '100%', height: 190, borderRadius: 16, marginBottom: 12 },
  sheetBar: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingTop: 12 },
  h2: { color: C.text, fontFamily: H, fontSize: 26, marginTop: 4 }, label: { color: C.text, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 6, borderRadius: 12, borderWidth: 1, borderColor: C.line },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: C.muted }, optTxt: { flex: 1, color: C.text, fontSize: 15 },
  qty: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  qTxt: { color: C.text, fontSize: 20 }, qNum: { color: C.text, fontSize: 16, minWidth: 18, textAlign: 'center' },
  cta: { flex: 1, backgroundColor: C.mustard, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  ctaTxt: { color: C.bg, fontWeight: '800', fontSize: 16 }, ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.mustard, marginTop: 12 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: C.line },
  input: { marginTop: 10, padding: 14, borderRadius: 12, backgroundColor: C.card, color: C.text, fontSize: 15 },
  sum: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderColor: C.line, backgroundColor: C.card, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', gap: 2 }, tabTxt: { color: C.muted, fontSize: 12, fontWeight: '600' },
});