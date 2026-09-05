import type { ImageMetadata } from 'astro';

/**
 * СВЯЗЬ МЕЖДУ АДРЕСОМ ФОТО В ТЕКСТАХ И САМИМ ФАЙЛОМ
 *
 * В текстах фото пишется коротким понятным адресом:
 *     image: /media/industries/oborudovanie.jpg
 *
 * А сам файл лежит в src/assets/media/industries/oborudovanie.jpg —
 * только оттуда Astro может его обработать: сжать, сделать современный
 * формат и заготовить несколько размеров под разные экраны.
 *
 * Список файлов собирается сам. Чтобы добавить фото, достаточно положить
 * его в папку — трогать код не нужно.
 */
const files = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/media/**/*.{jpg,jpeg,png,webp,avif}',
  { eager: true },
);

/** Готовый список: '/media/industries/oborudovanie.jpg' → файл */
const byPublicPath = new Map<string, ImageMetadata>(
  Object.entries(files).map(([full, mod]) => [
    full.replace('/src/assets/media/', '/media/'),
    mod.default,
  ]),
);

/**
 * Находит файл по адресу из текстов.
 * Если файла нет — возвращает undefined, и блок покажет заглушку
 * вместо того, чтобы уронить сборку.
 */
export function findImage(path: string | undefined): ImageMetadata | undefined {
  if (!path) return undefined;

  const found = byPublicPath.get(path);

  // Путь указан, а файла нет — почти всегда опечатка в тексте.
  // Ругаемся в журнал сборки, но сайт не роняем.
  if (!found) {
    console.warn(
      `\n[фото] Не найден файл: ${path}\n` +
        `       Положите его в src/assets/media/ по этому же пути.\n` +
        `       Сейчас есть: ${listImages().join(', ') || '(пусто)'}\n`,
    );
  }

  return found;
}

/** Есть ли вообще такой файл — для проверок при сборке. */
export function listImages(): string[] {
  return [...byPublicPath.keys()].sort();
}

const vectors = import.meta.glob<string>('/src/assets/media/**/*.svg', {
  eager: true, query: '?url', import: 'default',
});
export function findMediaUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (/\.svg$/i.test(path)) {
    return vectors[path.replace(/^\/media\//, '/src/assets/media/')];
  }
  return findImage(path)?.src;
}
