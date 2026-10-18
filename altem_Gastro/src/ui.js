import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { useStyles, useTheme } from './theme';

export const zl = (minor) => `${(minor / 100).toFixed(2).replace('.', ',')} zł`;

const factory = (t) => {
  const c = t.colors, r = t.radius, sp = t.spacing;
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: sp.sm, padding: sp.md },
    h1: { color: c.text, fontFamily: t.font.display, fontSize: 56, lineHeight: 62 }, h2: { color: c.text, fontFamily: t.font.display, fontSize: 26 },
    name: { color: c.text, fontSize: 17, fontWeight: '700' }, muted: { color: c.muted, fontSize: 13, marginTop: 2 }, tag: { color: c.secondary, fontWeight: '700', fontSize: 12 },
    price: { color: c.primary, fontFamily: t.font.display, fontSize: 20, marginTop: sp.xs }, label: { color: c.text, fontWeight: '700', marginTop: sp.md, marginBottom: 6 },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: sp.md, marginTop: 10, padding: 10, borderRadius: r.md, backgroundColor: c.surface },
    thumb: { width: 64, height: 64, borderRadius: r.sm, backgroundColor: c.border, alignItems: 'center', justifyContent: 'center' },
    btn: { flex: 1, backgroundColor: c.primary, borderRadius: r.md, paddingVertical: 15, alignItems: 'center' }, btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.primary },
    btnTxt: { color: c.onPrimary, fontWeight: '800', fontSize: 16 },
    chip: { paddingVertical: 9, paddingHorizontal: sp.md, borderRadius: r.pill, borderWidth: 1, borderColor: c.border }, chipOn: { backgroundColor: c.primary, borderColor: c.primary },
    chipTxt: { color: c.text, fontWeight: '600' },
    input: { marginTop: 10, padding: 14, borderRadius: r.sm + 2, backgroundColor: c.surface, color: c.text, fontSize: 15 },
    opt: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 6, borderRadius: r.sm + 2, borderWidth: 1, borderColor: c.border },
    dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: c.muted }, optTxt: { flex: 1, color: c.text, fontSize: 15 },
    qty: { flexDirection: 'row', alignItems: 'center', gap: 10 }, qBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
    qTxt: { color: c.text, fontSize: 20 }, qNum: { color: c.text, fontSize: 16, minWidth: 18, textAlign: 'center' },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }, sheet: { maxHeight: '88%', backgroundColor: c.background, borderTopLeftRadius: r.lg, borderTopRightRadius: r.lg, padding: sp.md },
    tabs: { flexDirection: 'row', borderTopWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingTop: sp.sm },
    tab: { flex: 1, alignItems: 'center', gap: 2 }, tabTxt: { color: c.muted, fontSize: 12, fontWeight: '600' },
    step: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  });
};
export const useS = () => useStyles(factory);

export const Button = ({ title, onPress, ghost, disabled, loading, style }) => {
  const s = useS(); const t = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={[s.btn, ghost && s.btnGhost, (disabled || loading) && { opacity: 0.4 }, style]}>
      {loading ? <ActivityIndicator color={t.colors.onPrimary} /> : <Text style={[s.btnTxt, ghost && { color: t.colors.primary }]}>{title}</Text>}
    </Pressable>
  );
};
export const CategoryChip = ({ label, on, onPress, style }) => {
  const s = useS(); const t = useTheme();
  return <Pressable onPress={onPress} style={[s.chip, on && s.chipOn, style]}><Text style={[s.chipTxt, on && { color: t.colors.onPrimary }]}>{label}</Text></Pressable>;
};
export const Stepper = ({ qty, onChange }) => {
  const s = useS();
  return <View style={s.qty}><Pressable onPress={() => onChange(qty - 1)} style={s.qBtn}><Text style={s.qTxt}>−</Text></Pressable><Text style={s.qNum}>{qty}</Text><Pressable onPress={() => onChange(qty + 1)} style={s.qBtn}><Text style={s.qTxt}>+</Text></Pressable></View>;
};
export const Sheet = ({ onClose, children }) => {
  const s = useS();
  return <Modal visible animationType="slide" transparent onRequestClose={onClose}><Pressable style={s.backdrop} onPress={onClose} /><View style={s.sheet}>{children}</View></Modal>;
};
export const Option = ({ on, text, price, onPress }) => {
  const s = useS(); const t = useTheme();
  return <Pressable onPress={onPress} style={[s.opt, on && { borderColor: t.colors.primary }]}><View style={[s.dot, on && { backgroundColor: t.colors.primary }]} /><Text style={s.optTxt}>{text}</Text>{!!price && <Text style={s.muted}>+{zl(price)}</Text>}</Pressable>;
};
// Kształt grupy modyfikatorów ZAŁOŻONY: {id,name,required,min_select,max_select,options:[{id,name,price_minor}]}
export const ModifierGroup = ({ group, selected, onToggle }) => {
  const s = useS(); const need = group.min_select || (group.required ? 1 : 0);
  return (
    <View>
      <Text style={s.label}>{group.name}{need > 0 ? ' (wymagane)' : ''}</Text>
      {group.options.map((o) => <Option key={o.id} on={selected.includes(o.id)} text={o.name} price={o.price_minor} onPress={() => onToggle(group, o.id)} />)}
    </View>
  );
};
const STEPS = [['received', 'Otrzymaliśmy zamówienie'], ['accepted', 'Restauracja przyjęła'], ['preparing', 'Przygotowujemy'], ['ready', 'Gotowe do odbioru / w dostawie'], ['completed', 'Zrealizowane']];
const ALIAS = { new: 'received', placed: 'received', pending: 'received', confirmed: 'accepted', in_progress: 'preparing', out_for_delivery: 'ready', delivered: 'completed', done: 'completed' }; // ZAŁOŻONE
export const StatusTimeline = ({ status }) => {
  const s = useS(); const t = useTheme(); const key = ALIAS[status] || status; const idx = STEPS.findIndex(([k]) => k === key);
  if (key === 'cancelled' || key === 'canceled') return <Text style={[s.h2, { color: t.colors.secondary }]}>Anulowane</Text>;
  return (
    <View>
      {STEPS.map(([k, label], i) => (
        <View key={k} style={s.step}><View style={[s.dot, i <= idx && { backgroundColor: t.colors.primary, borderColor: t.colors.primary }]} /><Text style={[s.optTxt, i > idx && { color: t.colors.muted }]}>{label}</Text></View>
      ))}
      {idx < 0 && <Text style={s.muted}>Status z serwera: {String(status)}</Text>}
    </View>
  );
};
export const BottomNav = ({ tabs, active, onChange, bottomInset }) => {
  const s = useS(); const t = useTheme();
  return (
    <View style={[s.tabs, { paddingBottom: bottomInset + 8 }]}>
      {tabs.map(([k, icon, label]) => (
        <Pressable key={k} style={s.tab} onPress={() => onChange(k)}><Text style={{ fontSize: 20, opacity: active === k ? 1 : 0.5 }}>{icon}</Text><Text style={[s.tabTxt, active === k && { color: t.colors.primary }]}>{label}</Text></Pressable>
      ))}
    </View>
  );
};