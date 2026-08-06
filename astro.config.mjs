// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE_URL, BASE_PATH } from './site.config.mjs';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,

  // Ссылки и папки страниц всегда со слешем на конце: /uslugi/
  // Так одинаково работает и на GitHub Pages, и на обычном хостинге.
  trailingSlash: 'always',
  build: { format: 'directory' },

  // Языки. Сейчас только русский, без префикса в адресе.
  // Чтобы добавить итальянский, будет достаточно дописать 'it' в список
  // и создать папку src/pages/it/ — остальное уже готово.
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru'],
    routing: { prefixDefaultLocale: false },
  },

  // Каталог блоков — служебная страница для заказчика,
  // в карту сайта для поисковиков она не попадает.
  integrations: [sitemap({ filter: (page) => !page.includes('/blocks/') })],
});
