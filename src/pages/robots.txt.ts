import type { APIRoute } from 'astro';
import { asset } from '../lib/url';
import { DOMAIN } from '../../site.config.mjs';

// robots.txt собирается сам и всегда указывает на актуальный адрес —
// достаточно поменять домен в site.config.mjs.
//
// Важно: путь к карте сайта берётся через asset(). На GitHub Pages сайт
// лежит в подпапке, и без этого ссылка вела бы в корень домена, где
// карты нет.
//
// Индексировать разрешено только боевому домену. Сборка на GitHub Pages —
// это предпросмотр: если открыть её поисковикам, в выдаче появится полный
// дубль сайта, который отнимает у боевого домена часть сигналов.
export const GET: APIRoute = ({ site }) => {
  const host = site?.hostname ?? '';
  const isProduction = host === DOMAIN || host === `www.${DOMAIN}`;

  if (!isProduction) {
    const body = [
      '# Предпросмотр, не боевой адрес. Индексация запрещена целиком.',
      'User-agent: *',
      'Disallow: /',
      '',
    ].join('\n');
    return new Response(body, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const sitemap = new URL(asset('/sitemap-index.xml'), site).href;

  const body = [
    'User-agent: *',
    'Allow: /',
    // панель редактора и каталог блоков — служебные, индексировать незачем
    `Disallow: ${asset('/admin/')}`,
    `Disallow: ${asset('/blocks/')}`,
    '',
    `Sitemap: ${sitemap}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
