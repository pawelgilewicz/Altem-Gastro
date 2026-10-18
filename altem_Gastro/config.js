// Konfiguracja wydania. Brandowane wersje = inny tenant + branding, ten sam kod.
export const API_BASE = 'https://rc-gastro.altem.pl/api/v1';
export const TENANT = 'ale-yeah';
const A = 'https://rc-gastro.altem.pl/gastro/assets/';
export const BRAND = {
  name: 'Ale Yeah! Burger', city: 'Brzeg Dolny',
  address: 'Aleje Jerozolimskie 43, 56-120 Brzeg Dolny', phone: '782453111',
  logo: A + 'logo.png', hero: A + 'hero.png',
  colors: { bg: '#16110E', card: '#231B16', line: '#3A2E26', accent: '#FFB81C', hot: '#E8401C', text: '#F6EDE0', muted: '#A39687' },
  emoji: { 'ay-cat-burgery': '🍔', 'ay-cat-dodatki': '🍟', 'ay-cat-boxy': '📦', 'ay-cat-sosy': '🥫', 'ay-cat-napoje': '🥤', 'ay-cat-napoje-18': '🍺' },
};