import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const text=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const json=(p)=>JSON.parse(text(p));
const locales=['it','en','ru'];
const expectedHeadings={
 it:'Bielorussia e UEE per le imprese italiane.',
 en:'Belarus and the EAEU for Italian businesses.',
 ru:'Выход в Беларусь и ЕАЭС для итальянского бизнеса.',
};
for(const locale of locales){
 test(`${locale}: simplified hero and contact CTA`,()=>{
  const h=json(`src/content/pages/${locale}/home.json`);
  assert.equal(h.hero.titleLines.join(' '),expectedHeadings[locale]);
  assert.equal(h.hero.titleLines.length,2);
  assert.ok(h.contact.label);
  if(locale==='ru') assert.equal(h.contact.label,'Перейти в контакты');
 });
 test(`${locale}: shared partner descriptions and city-only contacts`,()=>{
  const s=json(`src/content/settings/${locale}.json`);
  assert.equal(s.company.tagline,'Italy meets Eurasia');
  assert.deepEqual(s.partners.map(x=>x.id),['naip','retail']);
  assert.ok(s.partners.every(p=>p.description.length>100));
  assert.ok(s.partners.every(p=>!p.logo));
  assert.ok(s.offices.every(o=>o.city && o.note && !o.address));
  assert.doesNotMatch(JSON.stringify(s),/Gozzi|61032/);
  if(locale==='ru'){
   assert.equal(s.partners[0].description,'Государственное агентство по привлечению инвестиций в Беларусь. VIKUB является его официальным представителем в Италии.');
   assert.equal(s.partners[1].description,'Партнёр VIKUB по выводу производителей в торговые сети Беларуси и России. Работает с розничными сетями и оптовыми каналами, сопровождает переговоры, заключение контрактов и пост-продажное взаимодействие.');
  }
 });
 test(`${locale}: shortened team and generic expert network`,()=>{
  const a=json(`src/content/pages/${locale}/about.json`);
  assert.equal(a.team.people.length,2);assert.match(a.team.people[0].about,/30/);
  assert.deepEqual(a.experts.people,[]);assert.ok(a.experts.text.length>100);
  assert.equal(a.status.items.length,4);assert.equal(a.status.retail,'');
  assert.doesNotMatch(JSON.stringify(a),/Skreb|Скреб|Planix|клиентскую базу|client base/);
 });
}
test('partner blocks use one text-only component on both pages',()=>{
 for(const view of ['HomeView','AboutView']) assert.match(text(`src/views/${view}.astro`),/<PartnerGrid locale=\{locale\} \/>/);
 const grid=text('src/components/PartnerGrid.astro');
 assert.match(grid,/partner\.description/);assert.doesNotMatch(grid,/<img\b|<Icon\b|findMediaUrl/);
 assert.doesNotMatch(text('src/components/Hero.astro'),/PartnerMarks/);
});
test('supplied wordmark and V stay vector-only and gold is retained on dark surfaces',()=>{
 for(const file of ['vikub.svg','vikub-v.svg','vikub-on-dark.svg']){
  const svg=text(`public/brand/${file}`);
  assert.match(svg,/<path/);assert.doesNotMatch(svg,/<script\b|<image\b|<text\b|<foreignObject|<use\b/);
  assert.match(svg,/#B78C42/);
 }
 const original=text('public/brand/vikub.svg'), dark=text('public/brand/vikub-on-dark.svg');
 assert.deepEqual([...original.matchAll(/\bd="([^"]+)"/g)].map(m=>m[1]),[...dark.matchAll(/\bd="([^"]+)"/g)].map(m=>m[1]));
 assert.match(dark,/#F5F5F5/);assert.doesNotMatch(dark,/fill="#212121"/);
});
test('header and footer have accessible logos and the new slogan',()=>{
 const h=text('src/components/Header.astro'),f=text('src/components/Footer.astro');
 assert.match(h,/asset\('\/brand\/vikub\.svg'\)/);assert.match(h,/alt="VIKUB"/);
 assert.match(h,/Italy meets Eurasia/);assert.doesNotMatch(h,/Italy meets Belarus/);
 assert.match(f,/asset\('\/brand\/vikub-on-dark\.svg'\)/);assert.match(f,/lang="en"/);
 assert.match(f,/site-footer__socials"><SocialLinks/);
 assert.doesNotMatch(f,/site-footer__bottom[^\n]*<SocialLinks/);
 assert.match(f,/© 2026/);
});
test('contacts render only city/country, not stored full address or personal address',()=>{
 const view=text('src/views/ContactsView.astro');
 assert.match(view,/office\.city/);assert.match(view,/office\.note/);
 assert.doesNotMatch(view,/office\.address|office\.person|<address/);
 const form=text('src/components/ContactForm.astro');
 for(const field of ['name','email','phone','message']) assert.match(form,new RegExp(`name="${field}"`));
 assert.match(form,/configured/);assert.match(form,/disabled=\{!configured\}/);
});
test('favicon, device icon and sharing image have base-path safe references',()=>{
 const base=text('src/layouts/BaseLayout.astro');
 for(const path of ['/favicon.svg','/favicon-32.png','/apple-touch-icon.png','/brand/vikub-social.png','/brand/vikub.svg']){
  assert.ok(base.includes(`asset('${path}')`),path);
  assert.ok(existsSync(new URL('../public'+path,import.meta.url)),path);
 }
 assert.match(base,/slogan:settings\.company\.tagline/);
});
test('the final Russian programme is exactly the eight requested topics',()=>{
 const e=json('src/content/pages/ru/events.json');
 assert.deepEqual(e.program,[
 'Вступительное слово — Марио Убальди и Виктория Губанова, VIKUB',
 'Инвестиционный климат и преференции Беларуси — представители НАИП',
 'Конкретные запросы белорусского бизнеса по пяти секторам — представители НАИП',
 'Презентации белорусских компаний с реальными потребностями в поставках, технологиях и партнёрстве',
 'Юридический блок — санкционные риски (итальянский юрист)',
 'Налоговый блок — налогообложение, международные соглашения (белорусский налоговый специалист)',
 'Логистика и сертификация — практические вопросы выхода на рынок',
 'Вопросы и ответы']);
 const seminar=json('src/content/system/seminar.json');
 assert.match(seminar.startAt,/2026-10-01T10:00:00\+02:00/);
});
