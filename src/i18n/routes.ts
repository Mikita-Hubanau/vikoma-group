import type { Locale } from './config';

/**
 * Адреса страниц на каждом языке.
 *
 * Адреса намеренно разные: русскому посетителю понятнее /uslugi/,
 * итальянскому — /servizi/. Для поисковиков это тоже лучше.
 *
 * В шаблонах ссылки пишутся не адресом, а названием страницы:
 * href('services', locale) — и нужный адрес подставится сам.
 */
export const routes = {
  home: { ru: '/', it: '/', en: '/' },
  services: { ru: '/uslugi/', it: '/servizi/', en: '/services/' },
  industries: { ru: '/otrasli/', it: '/settori/', en: '/industries/' },
  about: { ru: '/o-kompanii/', it: '/azienda/', en: '/about/' },
  contacts: { ru: '/kontakty/', it: '/contatti/', en: '/contacts/' },
} as const satisfies Record<string, Record<Locale, string>>;

export type RouteKey = keyof typeof routes;

/** Порядок пунктов в главном меню. */
export const navOrder = ['services', 'industries', 'about', 'contacts'] as const;
