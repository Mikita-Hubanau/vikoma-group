/** Validate actual Astro output. Run AFTER npm run build. No extra packages. */
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { CONTACT_DETAILS, getContactsCopy } from '../src/data/contacts-page.mjs';

async function* htmlFiles(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) yield* htmlFiles(path);
    else if (item.name.endsWith('.html')) yield path;
  }
}

function decode(text) {
  return text.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : parseInt(code, 10)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, entity) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' })[entity]);
}

function attrs(source) {
  const result = {};
  for (const match of source.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return result;
}
const text = (html) => decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const requiredNames = ['name', 'email', 'phone', 'company', 'service', 'message', 'consent'];
const found = new Set();
let count = 0;

for await (const file of htmlFiles(resolve(process.argv[2] || 'dist'))) {
  const html = await readFile(file, 'utf8');
  if (!html.includes('data-contacts-page')) continue;
  const locale = attrs(html.match(/<html\b([^>]*)>/i)?.[1] || '').lang;
  assert.ok(['it', 'en', 'ru'].includes(locale), `Unknown language in ${file}`);
  const copy = getContactsCopy(locale);
  assert.equal(text(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || ''), copy.title, file);

  const formMatch = [...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)]
    .find((match) => Object.hasOwn(attrs(match[1]), 'data-contact-form'));
  assert.ok(formMatch, `Missing contact form: ${file}`);
  const formAttrs = attrs(formMatch[1]);
  assert.equal(formAttrs.method.toUpperCase(), 'POST');
  const form = formMatch[2];
  const controls = [...form.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)]
    .map((match) => ({ tag: match[1].toLowerCase(), ...attrs(match[2]) }));
  const required = controls.filter((control) => Object.hasOwn(control, 'required'));
  assert.deepEqual(required.map((control) => control.name), requiredNames, `Required fields/order: ${file}`);
  assert.equal(controls.find((control) => control.name === 'email').type, 'email');
  assert.equal(controls.find((control) => control.name === 'phone').type, 'tel');
  const consent = controls.find((control) => control.name === 'consent');
  assert.equal(consent.type, 'checkbox');
  assert.ok(!Object.hasOwn(consent, 'checked'));
  for (const name of requiredNames) {
    const id = controls.find((control) => control.name === name).id;
    assert.ok([...form.matchAll(/<label\b([^>]*)>/gi)].some((match) => attrs(match[1]).for === id), `Unlabelled ${name}`);
  }

  const select = [...form.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)]
    .find((match) => attrs(match[1]).name === 'service');
  assert.ok(select, `Missing topics: ${file}`);
  const options = [...select[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)]
    .map((match) => ({ ...attrs(match[1]), text: text(match[2]) }));
  assert.equal(options[0].value, '');
  assert.ok(Object.hasOwn(options[0], 'disabled'));
  assert.ok(Object.hasOwn(options[0], 'selected'));
  assert.deepEqual(options.slice(1).map((option) => option.text), copy.form.services);
  assert.deepEqual(options.slice(1).map((option) => option.value), copy.form.services);
  assert.ok(text(html).includes(copy.form.lead), `Missing first project paragraph: ${file}`);
  assert.ok(text(html).includes(copy.form.followUp), `Missing second project paragraph: ${file}`);
  const button = [...form.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)]
    .find((match) => Object.hasOwn(attrs(match[1]), 'data-submit-button'));
  assert.ok(button);
  assert.equal(text(button[2]), copy.form.submit);
  if (formAttrs['data-configured'] === 'false') {
    assert.ok(Object.hasOwn(attrs(form.match(/<fieldset\b([^>]*)>/i)[1]), 'disabled'));
    assert.ok(Object.hasOwn(attrs(button[1]), 'disabled'));
  }

  const links = [...html.matchAll(/<a\b([^>]*)>/gi)].map((match) => attrs(match[1]).href);
  for (const href of [`tel:${CONTACT_DETAILS.italy.tel}`, `tel:${CONTACT_DETAILS.belarus.tel}`, `mailto:${CONTACT_DETAILS.email}`]) {
    assert.ok(links.includes(href), `Missing ${href}: ${file}`);
  }
  const details = html.split('data-contacts-page')[1]?.split('</section>')[0] || '';
  assert.doesNotMatch(text(details), /Фано|Минск|\bFano\b|\bMinsk\b|офис|\boffice\b|\bufficio\b/i, file);
  assert.ok(!text(details).includes('Для компаний из Беларуси'), file);
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map((match) => attrs(match[1]).src).filter(Boolean);
  assert.ok(scripts.some((src) => src.endsWith('/scripts/contact-form.js')), `Missing transport script: ${file}`);
  found.add(locale);
  count += 1;
  console.log(`PASS ${locale}: ${file}`);
}
assert.deepEqual([...found].sort(), ['en', 'it', 'ru'], 'Expected contact pages in all three languages');
console.log(`Contact build checks passed for ${count} page(s).`);
