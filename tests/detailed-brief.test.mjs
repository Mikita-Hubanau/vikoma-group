import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hasText, isPhone } from '../public/scripts/form-validation.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const json=p=>JSON.parse(read(p));
for (const locale of ['ru','it','en']) {
 const page=name=>json(`src/content/pages/${locale}/${name}.json`);
 test(`${locale}: the brief's section counts and shared call to action`,()=>{
  const home=page('home'),services=page('services'),about=page('about'),events=page('events');
  assert.equal(home.about.paragraphs.length,3);
  assert.equal(home.whatWeDo.cards.length,2);
  assert.ok(home.whatWeDo.cards.every(c=>c.items.length===3&&c.partnerId&&c.icon));
  assert.equal(home.why.items.length,4);
  assert.equal(services.howWeWork.steps.length,5);
  assert.equal(about.team.people.length,3);
  assert.equal(events.benefits.items.length,4);
  if (locale==='en') {
   assert.equal(events.programGroups.length,3);
   assert.deepEqual(events.programGroups.flatMap(g=>g.indices),[1,2,3,4,5]);
   assert.equal(events.program.length,7);
   assert.equal(events.agenda,undefined);
  } else {
   assert.equal(events.agenda.items.length,6);
   assert.equal(events.agenda.optionalItems.length,2);
   assert.equal(events.program,undefined);
   assert.equal(events.programGroups,undefined);
  }
  assert.equal(services.lead,about.lead);assert.equal(services.lead,events.lead);
  assert.equal(page('contacts').lead,'');
 });
 test(`${locale}: real contact details, correct partner links and Victoria name`,()=>{
  const settings=json(`src/content/settings/${locale}.json`);
  assert.equal(settings.email,'info@vikub.com');
  assert.deepEqual(settings.phones.map(p=>p.tel),['+393282303160','+375296409880']);
  assert.deepEqual(settings.partners.map(p=>p.href),['https://investinbelarus.by','https://zdzelki.b24site.online']);
  assert.equal(page('about').team.people[1].name,locale==='ru'?'Виктория Губанова':'Viktoryia Hubanava');
 });
}
test('exact Russian copy for revised headings and contacts',()=>{
 const home=json('src/content/pages/ru/home.json');
 assert.equal(home.hero.titleLines.join(' '),'Выход итальянского бизнеса на рынки Беларуси, России и ЕАЭС');
 assert.equal(home.hero.lead,'Ищем и находим для вас рынки сбыта, партнёров и инвестиционные возможности в Беларуси и ЕАЭС.');
 const form=json('src/content/pages/ru/contacts.json').form;
 assert.equal(form.title,'Расскажите о своей задаче');
 assert.equal(form.service,'Чем мы можем помочь?');
 assert.equal(form.services[6],'Оценка перспектив моего проекта');
 assert.equal(form.responseNote,'Обычно мы отвечаем в течение 24 часов.');
});
test('home CTA appears immediately after Who and at the bottom',()=>{
 const source=read('src/views/HomeView.astro');
 assert.equal((source.match(/<ContactBlock /g)||[]).length,2);
 assert.match(source,/about-summary__text[\s\S]*?<\/section>\s*<ContactBlock/);
 assert.match(source,/<ContactBlock locale=\{locale\} \/>\s*<\/BaseLayout>/);
 assert.match(read('src/components/Hero.astro'),/<h2 class="hero__lead enter"/);
});
test('native phone and email constraints are present in real form markup',()=>{
 const form=read('src/components/ContactForm.astro');
 assert.match(form,/<input[^>]*name="phone"[^>]*required[^>]*pattern=/);
 assert.match(form,/<input[^>]*name="email"[^>]*type="email"[^>]*required/);
 assert.match(form,/contact-response-note/);
});
test('whitespace-only text and invalid phone strings are rejected',()=>{
 for(const value of ['', '   ', '\n\t',null,undefined,{}]) assert.equal(hasText(value),false);
 assert.equal(hasText(' Company '),true);
 for(const phone of ['+39 328 2303160','+375 (29) 640-98-80','00393282303160','1234567']) assert.equal(isPhone(phone),true,phone);
 for(const phone of ['', '      ', 'phone number', '123456', '1234567890123456','++393282303160','39/3282303160']) assert.equal(isPhone(phone),false,phone);
});
test('event CTA is paired with two non-link free-entry labels',()=>{
 const source=read('src/views/EventsView.astro');
 assert.match(source,/<span class="event-free">/);
 assert.match(source,/<p class="event-free event-free--form">/);
 assert.match(source,/<PageHeader[^>]+compact/);
 assert.match(source,/audience.paragraphs.length > 0/);
});
test('contact backend keeps required company and topic fields in its field map',()=>{
 const php=read('public/api/contact.php');
 const contact=php.split("'contact_enquiry' => [")[1].split("'seminar_registration'")[0];
 for(const name of ['phone','company','service']) assert.match(contact,new RegExp(`'${name}'\\s*=> \\['required' => true`));
 assert.match(php,/CONTACT_TOPICS\[\$language\]/);
 assert.match(php,/https:\/\/mikita-hubanau.github.io/);
 assert.doesNotMatch(php,/Access-Control-Allow-Origin: \*/);
});
