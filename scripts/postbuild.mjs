import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { parse, stringify } from 'yaml';
import { SITE_URL, BASE_PATH } from '../site.config.mjs';
// /admin/ should return to the actual deployment, not a hard-coded old domain.
const file='dist/admin/config.yml';
if (existsSync(file)) {
 const config=parse(readFileSync(file,'utf8'));
 config.site_url=new URL(BASE_PATH.endsWith('/') ? BASE_PATH : `${BASE_PATH}/`,SITE_URL).href.replace(/\/$/,'');
 writeFileSync(file,stringify(config));
}
const host=new URL(SITE_URL).hostname;
const isCustomDomain=!host.endsWith('.github.io') && !['localhost','127.0.0.1'].includes(host);
if (isCustomDomain && /^\/?$/.test(BASE_PATH)) writeFileSync('dist/CNAME',`${host}\n`);
else if (existsSync('dist/CNAME')) rmSync('dist/CNAME');
console.log('✓ Адрес редактора и CNAME согласованы с текущей сборкой.');
