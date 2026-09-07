import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateIntegrations } from '../src/lib/config-validation.mjs';
const text=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const json=p=>JSON.parse(text(p));
test('only the approved second layout is enabled',()=>{
 const config=json('src/content/system/design.json');assert.equal(config.defaultDesign,'balance');assert.equal(config.showSwitcher,false);
 assert.ok(text('src/layouts/BaseLayout.astro').includes('id="vikub-site"'));
 assert.match(text('src/lib/design.ts'),/defaultDesign: 'balance'/);
 assert.doesNotMatch(text('src/styles/designs.css'),/linear-gradient|radial-gradient/);
});
test('old local preferences cannot override the fixed layout',()=>{
 assert.doesNotMatch(text('src/layouts/BaseLayout.astro'),/localStorage.getItem|URLSearchParams|design-switcher/);
 assert.doesNotMatch(text('src/components/Header.astro'),/DesignSwitcher/);
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
  const a=json(`src/content/pages/${locale}/about.json`);assert.equal(a.team.people.length,3);assert.match(a.team.people[0].about,/30/);assert.deepEqual(a.experts.people,[]);assert.ok(a.experts.text);assert.equal(a.status.items.length,4);
  assert.deepEqual(json(`src/content/settings/${locale}.json`).partners.map(p=>p.id),['naip','retail']);
 });
 test(`${locale}: eight preserved agenda items, grouped topics and success copy`,()=>{
  const e=json(`src/content/pages/${locale}/events.json`);assert.equal(e.program.length,8);assert.ok(e.programNote);assert.equal(e.programGroups.length,3);assert.ok(e.formatValue);assert.ok(e.registration.success.includes('3–4'));assert.ok(e.seo.description.includes('10:00'));
 });
 test(`${locale}: stale brand, payment names and old team claims are absent`,()=>{
  const contents=['home','about','services','events','contacts'].map(name=>text(`src/content/pages/${locale}/${name}.json`)).join('\n')+text(`src/content/settings/${locale}.json`)+text(`src/content/services/${locale}/04-payments.md`);
  assert.doesNotMatch(contents,/Vikub Group|Young Platform|UniCredit|Banca Popolare|BPER|Planix|11:00|guarantee|гарантируем/i);
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
