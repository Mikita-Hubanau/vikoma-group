// Список языков сайта.
// Сейчас один. Чтобы добавить итальянский:
//   1) допишите 'it' сюда и в astro.config.mjs
//   2) создайте папку src/content/it/ с такими же файлами
//   3) создайте папку src/pages/it/ со страницами
export const locales = ['ru'] as const;

export type Locale = (typeof locales)[number];

/** Основной язык. Он показывается без префикса в адресе: vikoma.by/uslugi/ */
export const defaultLocale: Locale = 'ru';

/** Значение для атрибута <html lang="..."> */
export const htmlLang: Record<Locale, string> = {
  ru: 'ru-RU',
};
