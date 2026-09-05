import type { Locale } from './config';
export const routes = {
  home: { ru: '/', it: '/', en: '/' },
  about: { ru: '/o-kompanii/', it: '/azienda/', en: '/about/' },
  services: { ru: '/uslugi/', it: '/servizi/', en: '/services/' },
  events: { ru: '/meropriyatiya/', it: '/eventi/', en: '/events/' },
  contacts: { ru: '/kontakty/', it: '/contatti/', en: '/contacts/' },
  // Backward-compatible paths. These pages redirect to services.
  industries: { ru: '/otrasli/', it: '/settori/', en: '/industries/' },
} as const satisfies Record<string, Record<Locale, string>>;
export type RouteKey = keyof typeof routes;
export const navOrder = ['home', 'about', 'services', 'events', 'contacts'] as const;
