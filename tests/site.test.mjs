import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { validateHttps, validateIntegrations, validateSeminar, getEventState } from '../src/lib/config-validation.mjs';
import { locales, defaultLocale } from '../locales.config.mjs';
import { DOMAIN, BASE_PATH } from '../site.config.mjs';
const json=(path)=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const seminar=json('../src/content/system/seminar.json');
test('branding and locales',()=>{assert.equal(DOMAIN,'vikub.com');assert.equal(defaultLocale,'it');assert.deepEqual(locales,['it','en','ru']);assert.equal(typeof BASE_PATH,'string');});
test('unconfigured integrations remain genuinely disabled',()=>{assert.deepEqual(validateIntegrations({}),{googleAnalyticsId:'',contactFormEndpoint:'',registrationUrl:'',registrationFormEndpoint:''});});
test('valid production integration formats',()=>{assert.equal(validateIntegrations({googleAnalyticsId:'G-AB12CD34EF',contactFormEndpoint:'https://formspree.io/f/example',registrationUrl:'https://forms.gle/example'}).googleAnalyticsId,'G-AB12CD34EF');});
for (const url of ['http://example.com','javascript:alert(1)','https://user:password@example.com','https://example.com/#fragment']) {
 test(`reject unsafe endpoint ${url}`,()=>assert.throws(()=>validateHttps(url,'endpoint')));
}
test('Google Forms URLs cannot point to an unrelated site',()=>{assert.throws(()=>validateIntegrations({registrationUrl:'https://example.com/forms/123'}));assert.throws(()=>validateIntegrations({registrationUrl:'https://docs.google.com.evil.invalid/forms/123'}));assert.doesNotThrow(()=>validateIntegrations({registrationUrl:'https://docs.google.com/forms/d/e/abc/viewform'}));});
test('invalid Analytics ID fails instead of silently loading a wrong tag',()=>assert.throws(()=>validateIntegrations({googleAnalyticsId:'UA-123-1'})));
test('event dates and timezone are valid',()=>assert.equal(validateSeminar(seminar),seminar));
test('missing timezone in a timestamp fails',()=>assert.throws(()=>validateSeminar({...seminar,startAt:'2026-10-01T10:00:00'})));
test('registration cannot close after the start',()=>assert.throws(()=>validateSeminar({...seminar,registrationDeadline:'2026-10-02T10:00:00+02:00'})));
test('invalid timezone and duration fail',()=>{assert.throws(()=>validateSeminar({...seminar,timeZone:'Not/AZone'}));assert.throws(()=>validateSeminar({...seminar,durationMinutes:0}));});
test('10:00 Italian time on 1 October 2026 is preserved',()=>{const parts=new Intl.DateTimeFormat('en-GB',{timeZone:seminar.timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(seminar.startAt));assert.equal(parts,'10:00');assert.equal(new Date(seminar.startAt).toISOString(),'2026-10-01T08:00:00.000Z');});
test('deadline is inclusive, then registration closes',()=>{const d=Date.parse(seminar.registrationDeadline);assert.equal(getEventState(seminar,d),'open');assert.equal(getEventState(seminar,d+1),'closed');});
test('ongoing event cannot accept late registrations',()=>assert.equal(getEventState(seminar,Date.parse(seminar.startAt)+1000),'closed'));
test('event becomes archived after its scheduled duration',()=>assert.equal(getEventState(seminar,Date.parse(seminar.startAt)+seminar.durationMinutes*60000),'ended'));
for(const locale of locales){
 test(`${locale}: all five pages and full service set`,()=>{for(const name of ['home','about','services','events','contacts']){const data=json(`../src/content/pages/${locale}/${name}.json`);assert.ok(data.seo.title&&data.seo.description);}assert.equal(readdirSync(new URL(`../src/content/services/${locale}/`,import.meta.url)).filter(f=>f.endsWith('.md')).length,5);});
 test(`${locale}: no invented contacts or identities`,()=>{const settings=json(`../src/content/settings/${locale}.json`);assert.equal(settings.company.name,'VIKUB');assert.equal(settings.offices[0].person,'Mario Ubaldi');assert.ok(settings.offices.every(o=>o.address===''));assert.ok(settings.offices.every(o=>o.city&&o.note));assert.ok(!JSON.stringify(settings).includes('000-00-00'));assert.deepEqual(settings.socials.map(s=>s.type),['linkedin','telegram']);});
 test(`${locale}: required home and event content`,()=>{const home=json(`../src/content/pages/${locale}/home.json`);const events=json(`../src/content/pages/${locale}/events.json`);assert.equal(home.whatWeDo.cards.length,2);assert.equal(home.hero.secondaryCta.page,'events');assert.ok(home.seminar.title.includes('{date}'));assert.ok((events.agenda?.items ?? events.program).length>=1);assert.ok(events.registration.unavailable);assert.equal(events.lead,json(`../src/content/pages/${locale}/services.json`).lead);});
}
test('impossible calendar dates are rejected rather than normalized',()=>{
  assert.throws(()=>validateSeminar({...seminar,startAt:'2027-02-30T10:00:00+01:00'}),/календарную/);
});
test('a missing timezone cannot silently use the build server timezone',()=>{
  assert.throws(()=>validateSeminar({...seminar,timeZone:undefined}),/часовой пояс/);
});
