import type { APIRoute } from 'astro';
import { asset } from '../lib/url';

// robots.txt собирается сам и всегда указывает на актуальный адрес —
// достаточно поменять домен в site.config.mjs.
//
// Важно: путь к карте сайта берётся через asset(). На GitHub Pages сайт
// лежит в подпапке, и без этого ссылка вела бы в корень домена, где
// карты нет.
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL(asset('/sitemap-index.xml'), site).href;

  const body = ['User-agent: *', 'Allow: /', '', `Sitemap: ${sitemap}`, ''].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
