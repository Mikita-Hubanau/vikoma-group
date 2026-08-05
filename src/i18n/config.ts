// ─────────────────────────────────────────────────────────────
//  ЯЗЫКИ САЙТА
// ─────────────────────────────────────────────────────────────

/** Все языки, под которые готов сайт. */
export const locales = ['ru', 'it', 'en'] as const;

export type Locale = (typeof locales)[number];

/**
 * Языки, которые сейчас реально показываются посетителям.
 *
 * Итальянский и английский включатся, когда будут готовы переводы:
 * достаточно дописать их сюда и положить тексты в src/content/it/
 * и src/content/en/. Переключатель языков в шапке появится сам.
 */
export const enabledLocales: Locale[] = ['ru'];

/** Основной язык. Показывается без префикса: vikoma.by/uslugi/ */
export const defaultLocale: Locale = 'ru';

/** Значение для атрибута <html lang="..."> */
export const htmlLang: Record<Locale, string> = {
  ru: 'ru-RU',
  it: 'it-IT',
  en: 'en',
};

/** Как язык называется в переключателе. */
export const localeName: Record<Locale, string> = {
  ru: 'Рус',
  it: 'Ita',
  en: 'Eng',
};
