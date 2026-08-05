import { defaultLocale, type Locale } from '../i18n/config';

/**
 * Собирает правильную ссылку внутри сайта.
 *
 * Нужна потому, что на GitHub Pages сайт лежит в подпапке
 * (например /vikoma-group/), а на своём домене — в корне.
 * Все внутренние ссылки в шаблонах идут через эту функцию,
 * поэтому при переезде ничего править не надо.
 */
export function href(path = '/', locale: Locale = defaultLocale): string {
  // '/' или '/vikoma-group/' → '' или '/vikoma-group'
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');

  // Основной язык живёт без префикса, остальные — в своей папке: /it/...
  const langPrefix = locale === defaultLocale ? '' : `/${locale}`;

  const clean = String(path).replace(/^\/+/, '').replace(/\/+$/, '');
  const tail = clean === '' ? '/' : `/${clean}/`;

  return `${base}${langPrefix}${tail}`.replace(/\/{2,}/g, '/');
}

/**
 * Ссылка на файл из папки public/ — картинку, иконку, карту сайта.
 * В отличие от href() не добавляет слеш в конце.
 */
export function asset(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  return `${base}/${String(path).replace(/^\/+/, '')}`;
}

/** Полный адрес страницы — для канонической ссылки и Open Graph. */
export function absoluteUrl(path: string, site: URL | undefined): string {
  if (!site) return path;
  return new URL(path, site).toString();
}
