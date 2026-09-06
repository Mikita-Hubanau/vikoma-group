import { defaultLocale, type Locale } from '../i18n/config';
import { routes, type RouteKey } from '../i18n/routes';

/**
 * Собирает правильную ссылку на страницу сайта.
 *
 * Страница называется по смыслу, а не адресом: href('services', 'it')
 * вернёт /servizi/. Поэтому при смене адресов или добавлении языка
 * вёрстку править не нужно.
 *
 * Заодно учитывает, что на GitHub Pages сайт лежит в подпапке.
 */
export function href(page: RouteKey, locale: Locale = defaultLocale): string {
  return buildPath(routes[page][locale], locale);
}

/** То же самое, но для произвольного пути (нужно редко). */
export function path(rawPath: string, locale: Locale = defaultLocale): string {
  return buildPath(rawPath, locale);
}

function buildPath(rawPath: string, locale: Locale): string {
  // '/' или '/vikoma-group/' → '' или '/vikoma-group'
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');

  // Основной язык живёт без префикса, остальные — в своей папке: /ru/...
  const langPrefix = locale === defaultLocale ? '' : `/${locale}`;

  const clean = String(rawPath).replace(/^\/+/, '').replace(/\/+$/, '');
  const tail = clean === '' ? '/' : `/${clean}/`;

  return `${base}${langPrefix}${tail}`.replace(/\/{2,}/g, '/');
}

/**
 * Ссылка на файл из папки public/ — картинку, иконку, карту сайта.
 * В отличие от href() не добавляет слеш в конце.
 */
export function asset(assetPath: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  return `${base}/${String(assetPath).replace(/^\/+/, '')}`;
}

/**
 * Адрес картинки или видео.
 *
 * Свои файлы (начинаются со слеша) прогоняются через asset(), чтобы
 * работать и в подпапке на GitHub Pages. Чужие ссылки оставляем как есть.
 */
export function media(src: string | undefined): string | undefined {
  if (!src) return undefined;
  if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) return src;
  return asset(src);
}

/** Полный адрес страницы — для канонической ссылки и Open Graph. */
export function absoluteUrl(rawPath: string, site: URL | undefined): string {
  if (!site) return rawPath;
  return new URL(rawPath, site).toString();
}
