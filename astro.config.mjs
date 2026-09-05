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
    filter: (page) => !/\/(blocks|admin|otrasli|settori|industries)(\/|$)/.test(page) && !/\/404(\.html|\/)/.test(page),
  })],
});
