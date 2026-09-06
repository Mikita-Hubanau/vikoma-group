// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE_URL, BASE_PATH } from './site.config.mjs';
import { locales, defaultLocale } from './locales.config.mjs';

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  trailingSlash: 'always',
  build: { format: 'directory' },
  i18n: { defaultLocale, locales, routing: { prefixDefaultLocale: false } },
  integrations: [sitemap({
    filter: (page) => {
      const base = BASE_PATH.replace(/\/$/, '');
      const pathname = new URL(page).pathname;
      const path = (base && pathname.startsWith(base + '/') ? pathname.slice(base.length) : pathname) || '/';
      if (/^\/(blocks|admin|it)(\/|$)/.test(path) || /\/(otrasli|settori|industries)(\/|$)/.test(path) || /\/404(\.html|\/)/.test(path)) return false;
      return !/^\/(o-kompanii|uslugi|meropriyatiya|kontakty)\/$/.test(path);
    },
  })],
});
