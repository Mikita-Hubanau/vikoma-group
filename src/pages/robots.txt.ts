import type { APIRoute } from 'astro';

// robots.txt собирается сам и всегда указывает на актуальный домен —
// достаточно поменять его в site.config.mjs.
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('sitemap-index.xml', site).href;

  const body = ['User-agent: *', 'Allow: /', '', `Sitemap: ${sitemap}`, ''].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
