import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CONTACT_COPY, CONTACT_DETAILS, CONTACT_SOCIALS, getContactsCopy, getContactSocials } from '../src/data/contacts-page.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const view = read('../src/views/ContactsView.astro');
const form = read('../src/components/ContactForm.astro');
const requiredNames = ['name', 'email', 'phone', 'company', 'service', 'message', 'consent'];

const russianServices = [
  'Выход на рынок Беларуси',
  'Выход на рынок России / ЕАЭС',
  'Поиск торговых партнёров',
  'Инвестиции в Беларуси / ЕАЭС',
  'Поиск поставщика / производителя в Италии',
  'Поиск товара / оборудования в Италии',
  'Оценка перспектив моего проекта',
  'Другое',
];

test('contacts: exact approved phone numbers, normalized tel targets and email', () => {
  assert.deepEqual(CONTACT_DETAILS, {
    italy: { phone: '+39 328 2303160', tel: '+393282303160' },
    belarus: { phone: '+375 29 6409880', tel: '+375296409880' },
    email: 'info@vikub.com',
  });
  for (const item of [CONTACT_DETAILS.italy, CONTACT_DETAILS.belarus]) {
    assert.equal(item.phone.replaceAll(' ', ''), item.tel);
  }
});

test('contacts: exact Russian heading, project paragraphs and button text', () => {
  const copy = getContactsCopy('ru');
  assert.equal(copy.title, 'Свяжитесь с нами');
  assert.equal(copy.form.title, 'Расскажите о своей задаче');
  assert.equal(copy.form.lead, 'Выход на рынок, поиск партнёров, инвестиции, закупки в Италии. Мы свяжемся с вами и обсудим шаги. Если проект не наш профиль – скажем честно.');
  assert.equal(copy.form.followUp, '');
  assert.equal(copy.form.submit, 'Отправить запрос');
  assert.equal(copy.form.service, 'Чем мы можем помочь?');
});

test('contacts: the eight Russian request topics match the brief and its ordering', () => {
  assert.deepEqual(getContactsCopy('ru').form.services, russianServices);
});

test('contacts: each existing language has a complete matching copy structure', () => {
  assert.deepEqual(Object.keys(CONTACT_COPY).sort(), ['en', 'it', 'ru']);
  for (const locale of ['it', 'en', 'ru']) {
    const copy = getContactsCopy(locale);
    assert.deepEqual(Object.keys(copy).sort(), Object.keys(CONTACT_COPY.ru).sort());
    assert.deepEqual(Object.keys(copy.form).sort(), Object.keys(CONTACT_COPY.ru.form).sort());
    for (const [key, value] of Object.entries(copy)) {
      if (key !== 'lead' && typeof value === 'string') assert.ok(value.trim());
    }
    for (const [name, value] of Object.entries(copy.form)) {
      if (!['services','followUp'].includes(name)) assert.ok(typeof value === 'string' && value.trim(), `${locale}.${name}`);
    }
    assert.equal(copy.form.services.length, 8);
    assert.equal(new Set(copy.form.services).size, 8);
    assert.ok(copy.form.services.every((item) => typeof item === 'string' && item.trim()));
  }
});

test('contacts: unknown locales fail explicitly instead of silently mixing languages', () => {
  assert.throws(() => getContactsCopy('fr'), /Unsupported contacts locale/);
});

test('contacts: only approved social network names, with no invented account addresses', () => {
  assert.deepEqual(CONTACT_SOCIALS.map((item) => item.label), ['LinkedIn', 'Telegram']);
  assert.ok(CONTACT_SOCIALS.every((item) => typeof item.url === 'string'));
  assert.ok(getContactSocials().every((item) => typeof item.href === 'string'));
});

test('contacts: an empty social URL stays non-clickable, including whitespace-only values', () => {
  assert.deepEqual(getContactSocials([{ label: 'Telegram', url: '  ' }]), []);
  assert.deepEqual(getContactSocials([{ label: 'LinkedIn', url: '  ' }]), [{label:'LinkedIn',href:''}]);
  assert.match(view, /social\.href\s*\?/);
  assert.match(view, /<span class="contact-socials__pending">/);
  assert.doesNotMatch(view, /href=["']#?["']/);
});

test('contacts: social link validation permits HTTPS and rejects invalid or executable URLs', () => {
  assert.equal(getContactSocials([{ label: 'Test', url: ' https://example.org/profile ' }])[0].href, 'https://example.org/profile');
  for (const url of ['not a URL', '#', 'javascript:alert(1)', 'data:text/html,test', 'http://example.org', 'https://user:pass@example.org']) {
    assert.throws(() => getContactSocials([{ label: 'Test', url }]), /social URL|Social URL/);
  }
});

test('contacts: no old lead, city/office rendering or Belarus-specific section in the page view', () => {
  assert.match(view, /<PageHeader\s+title=\{copy\.title\}\s+lead=""/);
  assert.doesNotMatch(view, /page\.lead|settings\.offices|office\.city|office\.title|office\.note|Для компаний из Беларуси/);
  assert.match(view, /tel:\$\{CONTACT_DETAILS\.italy\.tel\}/);
  assert.match(view, /tel:\$\{CONTACT_DETAILS\.belarus\.tel\}/);
  assert.match(view, /mailto:\$\{CONTACT_DETAILS\.email\}/);
});

test('contacts: all seven user inputs, including company, phone, topic and consent, are required', () => {
  const controls = [...form.matchAll(/<(input|select|textarea)\b[^>]*>/g)].map((match) => match[0]);
  const required = controls.filter((tag) => /\brequired(?:\s|\/?>)/.test(tag));
  assert.equal(required.length, 7);
  for (const name of requiredNames) {
    const tag = controls.find((item) => item.includes(`name="${name}"`));
    assert.ok(tag, `Missing field ${name}`);
    assert.match(tag, /\brequired(?:\s|\/?>)/, `${name} must be required`);
  }
});

test('contacts: visible field order and explicit labels match the brief', () => {
  let previous = -1;
  for (const name of requiredNames) {
    const current = form.indexOf(`id="contact-${name}"`);
    assert.ok(current > previous, `${name} is out of order`);
    assert.ok(form.includes(`for="contact-${name}"`), `${name} is missing its label`);
    previous = current;
  }
});

test('contacts: correct input types and browser autofill hints are preserved', () => {
  assert.match(form, /name="email" type="email" autocomplete="email" required/);
  assert.match(form, /name="phone" type="tel" autocomplete="tel" required/);
  assert.match(form, /name="company" type="text" autocomplete="organization" required/);
  assert.match(form, /name="consent" type="checkbox" value="yes" required/);
  assert.doesNotMatch(form, /name="consent"[^>]*\bchecked\b/);
});

test('contacts: placeholder cannot count as a chosen topic; option text is sent in POST data', () => {
  assert.match(form, /<option value="" disabled selected>/);
  assert.match(form, /t\.services\.map/);
  assert.match(form, /<option value=\{service\}>\{service\}<\/option>/);
});

test('contacts: original endpoint, form transport script, markers and no-endpoint safety are preserved', () => {
  assert.match(form, /getIntegrations\(\)/);
  assert.match(form, /action=\{contactFormEndpoint \|\| undefined\} method="POST" data-contact-form/);
  assert.match(form, /<fieldset disabled=\{!configured\}>/);
  assert.match(form, /data-submit-button disabled=\{!configured\}/);
  assert.match(form, /asset\('\/scripts\/contact-form\.js'\)/);
  assert.match(form, /name="_gotcha"/);
  assert.match(form, /name="language" value=\{locale\}/);
  assert.match(form, /name="form_type" value="contact_enquiry"/);
  for (const marker of ['data-sending', 'data-submit', 'data-success', 'data-error', 'data-uncertain', 'data-rate-limited', 'data-validation-error', 'data-form-status']) {
    assert.ok(form.includes(marker), `Missing transport hook: ${marker}`);
  }
});

test('contacts: form status announcements, local privacy dialog and legal details remain available', () => {
  assert.match(form, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(form, /href="#privacy"/);
  const privacy = read('../src/components/PrivacyDialog.astro');
  assert.match(privacy, /<dialog id="privacy"/);
  assert.match(privacy, /notice\.policyUrl/);
  assert.doesNotMatch(view, /id="privacy"/);
  assert.match(form, /data-privacy-open/);
  assert.match(view, /settings\.legal\.map/);
});

test('contacts: select styling, keyboard focus and responsive grid are provided', () => {
  assert.match(form, /\.form-field select/);
  assert.match(form, /\.form-field select:focus-visible/);
  assert.match(form, /@media\(min-width:40rem\)/);
  assert.match(view, /@media\(min-width:48rem\)/);
});
