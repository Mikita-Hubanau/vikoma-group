import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { validateIntegrations, validateSeminar } from '../src/lib/config-validation.mjs';
import { locales } from '../locales.config.mjs';

const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const problems = [];
const missing = [];
const assert = (ok, text) => { if (!ok) problems.push(text); };
const pageNames = ['home','about','services','events','contacts'];
const requiredPartners = ['naip','retail'];
const requiredServices = ['market-research','retail','legal','payments','specialists'];
const routes = {
 ru:['ru/index','ru/o-kompanii','ru/uslugi','ru/meropriyatiya','ru/kontakty'],
 it:['index','azienda','servizi','eventi','contatti'],
 en:['en/index','en/about','en/services','en/events','en/contacts'],
};
const keys = (value, prefix='') => Object.entries(value).flatMap(([key,v]) => {
  if (key === 'ogImage') return [];
  const full = `${prefix}${key}`;
  if (Array.isArray(v)) return v.length && typeof v[0] === 'object' ? [full,...keys(v[0],`${full}[].`)] : [full];
  if (v && typeof v === 'object') return [full,...keys(v,`${full}.`)];
  return [full];
}).sort().join('|');
let integrations;
try {
 const base = json('src/content/system/integrations.json');
 integrations = validateIntegrations({
   googleAnalyticsId:process.env.PUBLIC_GOOGLE_ANALYTICS_ID || base.googleAnalyticsId,
   contactFormEndpoint:process.env.PUBLIC_CONTACT_FORM_ENDPOINT || base.contactFormEndpoint,
   registrationUrl:process.env.PUBLIC_REGISTRATION_URL || base.registrationUrl,
   registrationFormEndpoint:process.env.PUBLIC_REGISTRATION_FORM_ENDPOINT || base.registrationFormEndpoint,
 });
 validateSeminar(json('src/content/system/seminar.json'));
 for (const key of ['googleAnalyticsId', 'contactFormEndpoint']) if (!integrations[key]) missing.push(key);
 if (!integrations.registrationFormEndpoint && !integrations.contactFormEndpoint) missing.push('registrationFormEndpoint (or contactFormEndpoint)');
 const design=json('src/content/system/design.json');
 assert(['original','editorial','atlas','signature','grid'].includes(design.defaultDesign),'Неизвестный дизайн по умолчанию');
 assert(typeof design.showSwitcher==='boolean','Неверное значение showSwitcher');
} catch(error) { problems.push(error.message); }
for (const locale of locales) {
 for (let i=0;i<pageNames.length;i++) {
  const name=pageNames[i], file=`src/content/pages/${locale}/${name}.json`;
  assert(existsSync(file),`Нет файла: ${file}`);
  assert(existsSync(`src/pages/${routes[locale][i]}.astro`),`Нет маршрута: ${routes[locale][i]}`);
  if (!existsSync(file)) continue;
  const data=json(file), reference=json(`src/content/pages/ru/${name}.json`);
  assert(keys(data)===keys(reference),`Структура перевода расходится: ${file}`);
  assert(Boolean(data.seo?.title && data.seo?.description),`Пустой SEO-блок: ${file}`);
  assert(!/Vikoma|vikoma\.by|Vikub Group|Young Platform|UniCredit|BPER|Sondrio|Planix|11:00|000-00-00|60 реализованных/i.test(JSON.stringify(data)),`Старая заглушка в ${file}`);
  if (name==='home') {
   assert(data.whatWeDo.cards.length===4,`${locale}: на главной нужны 4 услуги`);
   assert(data.stats.items.length===4,`${locale}: нужны 4 факта`);
   assert(data.hero.cta.page==='services' && data.hero.secondaryCta.page==='events',`${locale}: неверные кнопки первого экрана`);
   assert(data.whatWeDo.cards.every((card)=>requiredServices.includes(card.anchor)),`${locale}: неизвестные ссылки на услуги`);
  }
  if (name==='about') assert(data.team.people.length===2,`${locale}: в ТЗ 2 участника команды`);
  if (name==='events') assert(data.program.length===8 && data.registration.unavailable,`${locale}: программа или статус регистрации пусты`);
 }
 const settings=json(`src/content/settings/${locale}.json`);
 assert(settings.company.name==='VIKUB',`${locale}: неправильное название компании`);
 assert(settings.partners.map(p=>p.id).join('|')===requiredPartners.join('|'),`${locale}: неправильный состав партнёров`);
 assert(settings.offices.map(o=>o.id).join('|')==='italy|belarus',`${locale}: порядок офисов отличается от ТЗ`);
 for (const office of settings.offices) {
  assert(Boolean(office.phone)===Boolean(office.tel),`${locale}/${office.id}: заполните оба поля телефона или оставьте оба пустыми`);
  if (office.tel) assert(/^\+[0-9]{7,15}$/.test(office.tel),`${locale}/${office.id}: неверный телефон`);
  if (locale==='ru') for (const field of ['address','phone','email']) if (!office[field]) missing.push(`office.${office.id}.${field}`);
 }
 for (const social of settings.socials) {
  if (social.href) {
   try {
    const url=new URL(social.href);
    assert(url.protocol==='https:' && !url.username && !url.password,`${locale}: недопустимая ссылка соцсети`);
    const hosts=social.type==='linkedin'?['linkedin.com','www.linkedin.com']:['t.me','telegram.me'];
    assert(hosts.includes(url.hostname),`${locale}: ссылка ${social.type} ведёт не на эту соцсеть`);
   } catch { problems.push(`${locale}: неверная ссылка ${social.type}`); }
  } else if (locale==='ru') missing.push(`social.${social.type}`);
 }
 for (const partner of settings.partners) {
  if (!partner.logo) { if(locale==='ru') missing.push(`partner.${partner.id}.logo`); }
  else assert(existsSync(partner.logo.replace(/^\/media\//,'src/assets/media/')),`${locale}: логотип не найден: ${partner.logo}`);
 }
 if(locale==='ru' && !json(`src/content/pages/${locale}/contacts.json`).privacy.policyUrl) missing.push('privacy.policyUrl');
 for (const person of json(`src/content/pages/${locale}/about.json`).team.people) {
  if (person.photo) assert(existsSync(person.photo.replace(/^\/media\//,'src/assets/media/')),`${locale}: фото не найдено: ${person.photo}`);
 }
 const files=readdirSync(`src/content/services/${locale}`).filter(f=>f.endsWith('.md')).sort();
 assert(files.length===5,`${locale}: должно остаться 5 новых файлов услуг. Удалите старые файлы перед копированием обновления.`);
 const anchors=files.map(file=>readFileSync(`src/content/services/${locale}/${file}`,'utf8').match(/^anchor:\s*(.+)$/m)?.[1]?.trim());
 assert(anchors.join('|')===requiredServices.join('|'),`${locale}: нарушены порядок или якоря услуг`);
}
if (problems.length) {
 console.error('Ошибки сайта:\n'+problems.map(p=>`  • ${p}`).join('\n'));
 process.exit(1);
}
console.log(`✓ Структура сайта: ${pageNames.length * locales.length} языковых страниц, 15 услуг, ссылки и настройки согласованы.`);
if (missing.length) {
 const text=[...new Set(missing)].map(p=>`  · ${p}`).join('\n');
 if (process.argv.includes('--launch')) { console.error('Перед публичным запуском заполните:\n'+text);process.exit(1); }
 console.warn('Не заполнены реальные подключения / материалы (не мешает сборке):\n'+text);
}
