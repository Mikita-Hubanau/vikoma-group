import { getCollection, getEntry, type CollectionKey } from 'astro:content';
import { defaultLocale, type Locale } from '../i18n/config';

// Файлы контента лежат по адресу <раздел>/<язык>/...
// Одиночные страницы получают id, равный коду языка: 'ru'.
// Записи списков — 'ru/имя-файла'.

/** Одна страница на нужном языке. */
export async function getPage<C extends CollectionKey>(
  collection: C,
  locale: Locale = defaultLocale,
) {
  const entry = await getEntry(collection, locale as never);
  if (!entry) {
    throw new Error(
      `Нет текстов на языке «${locale}» для раздела «${collection}».\n` +
        `Проверьте файл в src/content/ — возможно, он не создан или лежит не в той папке.`,
    );
  }
  return entry;
}

/** Все записи списка на нужном языке. */
export async function getList<C extends CollectionKey>(
  collection: C,
  locale: Locale = defaultLocale,
) {
  const all = await getCollection(collection);
  return all.filter((entry) => entry.id.startsWith(`${locale}/`));
}

/** Общие настройки: контакты, офисы, реквизиты. */
export async function getSettings(locale: Locale = defaultLocale) {
  const entry = await getPage('settings', locale);
  return entry.data;
}

/** Сортировка по полю order — чтобы порядок задавался в контенте, а не в коде. */
export function byOrder<T extends { data: { order: number } }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.data.order - b.data.order);
}
