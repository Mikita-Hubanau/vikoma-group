import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateIntegrations } from '../src/lib/config-validation.mjs';
const text=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const json=p=>JSON.parse(text(p));
const designs=['signature','balance','editorial','atlas','panorama'];
test('five Signature layouts, previous design 04 preserved as default',()=>{
 const config=json('src/content/system/design.json');assert.equal(config.defaultDesign,'signature');assert.equal(config.showSwitcher,true);
 for(const id of designs){assert.ok(text('src/lib/design.ts').includes(`'${id}'`));assert.ok(text('public/scripts/design-switcher.js').includes(`'${id}'`));}
 for(const id of designs.slice(1))assert.match(text('src/styles/designs.css'),new RegExp(`html#vikub-site\\[data-design='${id}'\\] \\.hero`));
 assert.ok(!/linear-gradient|radial-gradient/.test(text('src/styles/designs.css')));
 assert.ok(text('src/layouts/BaseLayout.astro').includes('id="vikub-site"')); // Required specificity anchor for scoped component CSS.
});
test('head applies saved design before paint, UI buttons are accessible',()=>{
 assert.ok(text('src/layouts/BaseLayout.astro').includes("localStorage.getItem('vikub-design')"));
 const buttons=text('src/components/DesignSwitcher.astro');assert.ok(buttons.includes('aria-pressed'));assert.ok(buttons.includes('aria-live="polite"'));assert.ok(buttons.includes('type="button"'));
});
test('dedicated registration endpoint validates HTTPS and credentials',()=>{
 assert.equal(validateIntegrations({registrationFormEndpoint:'https://forms.example.com/register'}).registrationFormEndpoint,'https://forms.example.com/register');
 for(const url of ['http://forms.example.com','https://a:b@example.com','javascript:alert(1)'])assert.throws(()=>validateIntegrations({registrationFormEndpoint:url}));
});
test('seminar form has exactly the requested personal fields; phone optional',()=>{
 const form=text('src/components/RegistrationForm.astro');
 for(const name of ['first_name','last_name','company','email'])assert.match(form,new RegExp(`name="${name}"[^>]*required`));
 assert.match(form,/name="phone"[^>]*type="tel"/);assert.doesNotMatch(form,/name="phone"[^>]*required/);
 assert.ok(form.includes('form_type'));assert.ok(form.includes('event_start'));assert.ok(form.includes('data-registration-form'));assert.ok(form.includes('name="consent"'));
});
test('registration is never a mock success; deadline and repeat submission guarded',()=>{
 const js=text('public/scripts/contact-form.js');assert.ok(js.includes('result.ok !== true && result.success !== true'));assert.ok(js.includes('completed'));assert.ok(js.includes('Date.parse(form.dataset.deadline'));assert.ok(js.includes('credentials: \'omit\''));
});
for(const locale of ['it','en','ru']){
 test(`${locale}: final team, separate expert network, two partners`,()=>{
  const a=json(`src/content/pages/${locale}/about.json`);assert.equal(a.team.people.length,2);assert.match(a.team.people[0].about,/30/);assert.deepEqual(a.experts.people,[]);assert.ok(a.experts.text);assert.equal(a.status.items.length,4);
  assert.deepEqual(json(`src/content/settings/${locale}.json`).partners.map(p=>p.id),['naip','retail']);
 });
 test(`${locale}: eight final agenda items, Zoom and success copy`,()=>{
  const e=json(`src/content/pages/${locale}/events.json`);assert.equal(e.program.length,8);assert.equal(e.programNote,'');assert.ok(e.formatValue.includes('Zoom'));assert.ok(e.registration.success.includes('3–4'));assert.ok(e.seo.description.includes('10:00'));
 });
 test(`${locale}: stale brand, payment names and old team claims are absent`,()=>{
  const contents=['home','about','services','events','contacts'].map(name=>text(`src/content/pages/${locale}/${name}.json`)).join('\n')+text(`src/content/settings/${locale}.json`)+text(`src/content/services/${locale}/04-payments.md`);
  assert.doesNotMatch(contents,/Vikub Group|Young Platform|UniCredit|Banca Popolare|BPER|Planix|11:00|20-лет|20 years|20 anni|guarantee|гарантируем/i);
 });
}
test('Russian registration confirmation matches the brief exactly',()=>assert.equal(json('src/content/pages/ru/events.json').registration.success,'Спасибо за регистрацию. Ссылка для подключения будет отправлена за 3–4 дня до семинара.'));
test('canonical Italian and Russian routes render the correct languages',()=>{
 assert.ok(text('src/pages/index.astro').includes('locale="it"'));
 assert.ok(text('src/pages/ru/index.astro').includes('locale="ru"'));
 assert.ok(text('src/pages/it/index.astro').includes('LegacyRedirect'));
 assert.ok(text('src/pages/meropriyatiya.astro').includes('LegacyRedirect'));
 assert.ok(text('src/components/LegacyRedirect.astro').includes('noindex, follow'));
});
