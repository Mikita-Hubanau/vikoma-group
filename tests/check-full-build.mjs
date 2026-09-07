/** Checks compiled Astro HTML, not source fixtures. Invoked by npm postbuild. */
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
const root=resolve(process.argv[2]||'dist');
const load=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const decode=s=>s.replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):+n)).replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[n]);
const txt=s=>decode(s.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const attr=(s,n)=>decode(s.match(new RegExp(`\\b${n}=(?:"([^"]*)"|'([^']*)')`))?.slice(1).find(x=>x!==undefined)||'');
const countClass=(s,name)=>[...s.matchAll(/<[a-z][^>]*\bclass=(?:"([^"]*)"|'([^']*)')[^>]*>/gi)].filter(m=>(m[1]??m[2]).split(/\s+/).includes(name)).length;
async function* files(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const p=join(dir,entry.name);if(entry.isDirectory())yield* files(p);else if(p.endsWith('.html'))yield p;}}
const found=new Set();
for await (const file of files(root)) {
 const html=await readFile(file,'utf8');const main=html.match(/<main\b([^>]*)>([\s\S]*?)<\/main>/i);if(!main)continue;
 const kind=attr(main[1],'data-page');if(!['home','services','about','events','contacts'].includes(kind))continue;
 const locale=attr(html.match(/<html\b([^>]*)>/i)?.[1]||'','lang');
 assert.ok(['ru','it','en'].includes(locale),file);
 const page=await load(`src/content/pages/${locale}/${kind}.json`),body=main[2],text=txt(body);
 assert.equal(attr(html.match(/<html\b([^>]*)>/i)[1],'data-design'),'balance',file);
 assert.doesNotMatch(html,/data-design-switcher|data-design-choice|src=["'][^"']*design-switcher/);
 for(const a of html.matchAll(/<a\b([^>]*)>/gi))assert.ok(!attr(a[1],'href').includes('/admin/'),file);
 assert.equal((body.match(/<h1\b/g)||[]).length,1,file);
 const heading=txt(body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)[1]);
 assert.equal(heading,kind==='home'?page.hero.titleLines.join(' '):page.title,file);
 assert.equal(countClass(body,'page-header__lead'),['home','contacts'].includes(kind)?0:1,file);
 if(!['home','contacts'].includes(kind))assert.ok(text.includes(page.lead),file);
 assert.equal(countClass(body,'contact-block'),kind==='home'?2:kind==='contacts'?0:1,file);
 if(kind==='home'){
  assert.equal(countClass(body,'service-card'),2);assert.equal(countClass(body,'feature'),4);
  assert.equal(countClass(body,'home-belarus'),1);for(const p of page.about.paragraphs)assert.ok(text.includes(p));
  assert.equal(countClass(body,'partner-detail'),2);assert.ok(text.includes(page.hero.lead));
 }
 if(kind==='services'){assert.equal(countClass(body,'service'),2);assert.equal(countClass(body,'step'),5);assert.ok(text.includes(page.expertSupport.title));}
 if(kind==='about'){assert.equal(countClass(body,'person'),3);assert.equal(countClass(body,'partner-detail'),2);for(const p of page.team.people){assert.ok(text.includes(p.name));assert.ok(text.includes(p.about));}}
 if(kind==='events'){
  assert.equal(countClass(body,'feature'),4);assert.equal(countClass(body,'program-group'),3);assert.equal(countClass(body,'event-free'),2);
  for(const topic of page.program)assert.ok(text.includes(topic),topic);
  assert.ok(text.includes(page.durationValue));assert.ok(text.includes('10:00'));assert.equal(countClass(body,'page-header--compact'),1);
 }
 if(kind==='contacts'){assert.equal(countClass(body,'contact-detail'),3);assert.ok(text.includes(page.form.responseNote));assert.ok(text.includes(page.form.title));}
 found.add(`${locale}/${kind}`);console.log(`PASS ${locale}/${kind}: compiled HTML`);
}
assert.equal(found.size,15,'Expected all 15 translated public pages');
console.log('Full-site HTML checks passed: 15 pages, Balance only.');
