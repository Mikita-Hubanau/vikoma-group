import { getCollection, getEntry, type CollectionKey } from 'astro:content';
import { defaultLocale, type Locale } from '../i18n/config';

// Файлы контента лежат по адресу <язык>/<остальное>,
// поэтому id записи всегда начинается с кода языка: 'ru/pages/home'.

/** Все записи коллекции на нужном языке, без префикса языка в id. */
export async function getLocalized<C extends CollectionKey>(
  collection: C,
  locale: Locale = defaultLocale,
) {
  const all = await getCollection(collection);
  return all.filter((entry) => entry.id.startsWith(`${locale}/`));
}

/** Одна запись — например, страница целиком. */
export async function getLocalizedEntry<C extends CollectionKey>(
  collection: C,
  path: string,
  locale: Locale = defaultLocale,
) {
  const entry = await getEntry(collection, `${locale}/${path}` as never);
  if (!entry) {
    throw new Error(
      `Не найден файл контента: src/content/${locale}/${path} (коллекция «${collection}»)`,
    );
  }
  return entry;
}

/** Общие настройки: контакты, офисы, реквизиты. */
export async function getSettings(locale: Locale = defaultLocale) {
  const entry = await getLocalizedEntry('settings', 'settings', locale);
  return entry.data;
}

/** Сортировка по полю order — чтобы порядок задавался в контенте, а не в коде. */
export function byOrder<T extends { data: { order: number } }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.data.order - b.data.order);
}
