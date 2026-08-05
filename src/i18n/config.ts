// ─────────────────────────────────────────────────────────────
//  ЯЗЫКИ САЙТА
// ─────────────────────────────────────────────────────────────

/** Все языки, под которые готов сайт. */
export const locales = ['ru', 'it', 'en'] as const;

export type Locale = (typeof locales)[number];

/**
 * Языки, которые сейчас реально показываются посетителям.
 *
 * Порядок здесь = порядок в переключателе в шапке.
 * Чтобы временно убрать язык с сайта, достаточно убрать его отсюда:
 * тексты и страницы останутся на месте.
 */
export const enabledLocales: Locale[] = ['ru', 'it', 'en'];

/** Основной язык. Показывается без префикса: vikoma.by/uslugi/ */
export const defaultLocale: Locale = 'ru';

/** Значение для атрибута <html lang="..."> */
export const htmlLang: Record<Locale, string> = {
  ru: 'ru-RU',
  it: 'it-IT',
  en: 'en',
};

/** Короткий код в переключателе — понятен на любом языке. */
export const localeName: Record<Locale, string> = {
  ru: 'RU',
  it: 'IT',
  en: 'EN',
};

/** Полное название языка — для подсказки и озвучки экрана. */
export const localeFullName: Record<Locale, string> = {
  ru: 'Русский',
  it: 'Italiano',
  en: 'English',
};
