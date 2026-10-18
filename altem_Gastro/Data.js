const A = 'https://rc-gastro.altem.pl/gastro/assets/';
export const IMG = { logo: A + 'logo.png', hero: A + 'hero.png' };
export const CATS = ['Burgery', 'Dodatki', 'Boxy', 'Sosy', 'Napoje'];
export const EMOJI = { Burgery: '🍔', Dodatki: '🍟', Boxy: '📦', Sosy: '🥫', Napoje: '🥤' };
export const SET_PRICE = 12; // dopłata za zestaw: frytki + napój
export const DELIVERY_FEE = 8;
export const EXTRAS = [
  { id: 'x1', name: 'Dodatkowy kotlet', price: 9 },
  { id: 'x2', name: 'Boczek', price: 4 },
  { id: 'x3', name: 'Cheddar', price: 3 },
  { id: 'x4', name: 'Jalapeño', price: 2 },
];
// Przykładowe menu (concept) – podmień na dane z API ALTEM GASTRO.
export const MENU = [
  { id: 'b1', cat: 'Burgery', name: 'Double Trouble', desc: 'Dwa wołowe kotlety, cheddar, boczek, sos Ale Yeah!', price: 34, img: A + 'double.png', hit: true },
  { id: 'b2', cat: 'Burgery', name: 'Cheeseburger', desc: 'Wołowina, podwójny cheddar, piklowany ogórek, musztarda.', price: 26, img: A + 'cheeseburger.png' },
  { id: 'b3', cat: 'Burgery', name: 'French', desc: 'Wołowina, kozi ser, karmelizowana cebula, rukola.', price: 31, img: A + 'french.png' },
  { id: 'b4', cat: 'Burgery', name: 'Mexican', desc: 'Wołowina, jalapeño, nachosy, salsa, ostry sos.', price: 31, img: A + 'mexican.png' },
  { id: 'd1', cat: 'Dodatki', name: 'Frytki', desc: 'Chrupiące, solone, z piekarnika do fryturki.', price: 12, img: A + 'fries.png' },
  { id: 'd2', cat: 'Dodatki', name: 'Krążki cebulowe', desc: '8 sztuk w złocistej panierce.', price: 14 },
  { id: 'x1', cat: 'Boxy', name: 'Box dla dwojga', desc: '2 burgery, duże frytki, 2 sosy.', price: 69 },
  { id: 'x2', cat: 'Boxy', name: 'Party Box', desc: '4 burgery, frytki, krążki, 4 sosy.', price: 129 },
  { id: 's1', cat: 'Sosy', name: 'Ale Yeah!', desc: 'Sos firmowy, lekko wędzony.', price: 4 },
  { id: 's2', cat: 'Sosy', name: 'Czosnkowy', desc: 'Gęsty, kremowy.', price: 4 },
  { id: 'n1', cat: 'Napoje', name: 'Cola 0,5 l', desc: '', price: 8 },
  { id: 'n2', cat: 'Napoje', name: 'Lemoniada domowa', desc: 'Cytryna, mięta, lód.', price: 12 },
];