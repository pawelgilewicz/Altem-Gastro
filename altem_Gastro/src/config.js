// Konfiguracja wydania (white-label). Zero logiki specyficznej dla tenanta poza tym plikiem.
import { Anton_400Regular } from '@expo-google-fonts/anton';

const A = 'https://rc-gastro.altem.pl/gastro/assets/';
const ENVS = { DEV: 'https://rc-gastro.altem.pl/api/v1', STAGE: 'https://rc-gastro.altem.pl/api/v1', PROD: null };
export const ENV = 'STAGE';
export const API_BASE = ENVS[ENV];

const TENANTS = {
  'ale-yeah': {
    id: 'ale-yeah', name: 'Ale Yeah! Burger', address: 'Aleje Jerozolimskie 43, 56-120 Brzeg Dolny', phone: '782453111',
    assets: { logo: A + 'logo.png', hero: A + 'hero.png' },
    modules: { delivery: true, pickup: true, dineIn: false, reservations: false, loyalty: false, promotions: false, reviews: false },
    icons: { 'ay-cat-burgery': '🍔', 'ay-cat-dodatki': '🍟', 'ay-cat-boxy': '📦', 'ay-cat-sosy': '🥫', 'ay-cat-napoje': '🥤', 'ay-cat-napoje-18': '🍺' },
    fonts: { Anton_400Regular },
    turnstile: { siteKey: null, origin: 'https://rc-gastro.altem.pl' }, // wpisz siteKey z Cloudflare, gdy Core wymaga Turnstile przy kontach
    theme: {
      statusBar: 'dark-content',
      colors: { primary: '#E64032', secondary: '#b8352c', background: '#f3eadc', surface: '#FFFFFF', border: '#E6E1DB', text: '#1E1E1E', muted: '#6F6A64', onPrimary: '#FFFFFF', graphite: '#1E1E1E' },
      radius: { sm: 10, md: 16, lg: 24, pill: 99 },
      spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
      font: { display: 'Anton_400Regular', body: undefined },
    },
  },
};
export const TENANT_ID = 'ale-yeah'; // wybór wydania; wspólna aplikacja wybierałaby to z listy lokali
export const TENANT = TENANTS[TENANT_ID];