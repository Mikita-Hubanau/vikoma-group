import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { privacyTextParts, privacyUI } from '../src/lib/privacy-notice.mjs';
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = (path) => JSON.parse(read(path));
const component = read('src/components/PrivacyDialog.astro');
const script = read('public/scripts/privacy-dialog.js');
const css = read('src/styles/privacy-dialog.css');

test('privacy: one shared dialog is rendered by the layout outside all forms', () => {
  const layout = read('src/layouts/BaseLayout.astro');
  assert.equal((layout.match(/<PrivacyDialog\s/g)||[]).length, 1);
  assert.match(layout, /<PrivacyDialog locale=\{locale\} \/>/);
  assert.ok(layout.indexOf('<PrivacyDialog') > layout.indexOf('</main>'));
  assert.match(component, /getPage\('contactsPage', locale\)/);
  assert.doesNotMatch(component, /<form\b|name="consent"|\bset:html=/);
  assert.doesNotMatch(read('src/views/ContactsView.astro'), /id="privacy"|page\.privacy\.text/);
});
for (const file of ['ContactForm','RegistrationForm','Footer','Analytics']) {
  test(`privacy: ${file} opens a local accessible dialog instead of another page`, () => {
    const source = read(`src/components/${file}.astro`);
    assert.match(source, /href="#privacy" data-privacy-open aria-haspopup="dialog" aria-controls="privacy"/);
    assert.doesNotMatch(source, /\$\{href\('contacts',\s*locale\)\}#privacy/);
  });
}
for (const locale of ['ru','it','en']) {
  test(`privacy: ${locale} notice contains the supplied controller details and purpose-specific consent`, () => {
    const {privacy,form} = json(`src/content/pages/${locale}/contacts.json`);
    const event = json(`src/content/pages/${locale}/events.json`);
    assert.equal(privacy.status, 'published');
    assert.equal(privacy.reviewNote, '');
    assert.equal(privacy.sections.length, 10);
    assert.ok(privacy.sections.every(s=>s.title.trim() && s.paragraphs.length>0 && s.paragraphs.every(p=>p.trim())));
    assert.equal(form.privacyLink, privacy.title);
    assert.equal(event.registration.privacyLink, privacy.title);
    assert.notEqual(form.consent, event.registration.consent);
    assert.match(JSON.stringify(privacy), /6\(1\)\(a\)/);
    assert.match(JSON.stringify(privacy), /info@vikub\.com/);
    assert.match(JSON.stringify(privacy), /Garante/);
    assert.match(JSON.stringify(privacy), /Mario Ubaldi/);
    assert.match(JSON.stringify(privacy), /Fano/);
    assert.match(JSON.stringify(privacy), /6 (?:месяц|mesi|months)/);
    assert.match(JSON.stringify(privacy), /Google Meet/);
    assert.doesNotMatch(JSON.stringify(privacy), /Требует заполнения|Требует подтверждения|To complete:|To confirm:/);
    assert.ok(privacyUI[locale].close);
  });
}
test('privacy: switching an unfinished notice back to draft still displays its review note', () => {
  assert.match(component, /notice\.status !== 'published'/);
  assert.match(component, /data-privacy-draft/);
  assert.match(component, /notice\.reviewNote/);
  const check = read('scripts/check-site.mjs');
  assert.match(check, /privacy\.status!=='published'/);
  assert.doesNotMatch(check, /missing\.push\('privacy\.policyUrl'\)/);
});
test('privacy: text-to-link helper permits only fixed safe contacts', () => {
  const parts = privacyTextParts('Email info@vikub.com; +39 328 2303160; www.garanteprivacy.it. <script>evil</script> javascript:alert(1)');
  assert.deepEqual(parts.filter(p=>p.href).map(p=>p.href), ['mailto:info@vikub.com','tel:+393282303160','https://www.garanteprivacy.it/']);
  assert.ok(parts.some(p=>p.text.includes('<script>') && !p.href)); // left as text, escaped by Astro
  assert.throws(()=>privacyTextParts(null), TypeError);
  assert.deepEqual(privacyTextParts(''), []);
});
test('privacy: native focus containment, Escape, return focus and legacy anchors', () => {
  assert.match(component, /aria-labelledby="privacy-title"/);
  assert.match(component, /id="privacy-title"[^>]*tabindex="-1" autofocus/);
  assert.match(script, /dialog\.showModal\(\)/);
  assert.match(script, /dialog\.addEventListener\('cancel'/);
  assert.match(script, /dialog\.addEventListener\('close', restore\)/);
  assert.match(script, /preventScroll:true/);
  assert.match(script, /window\.addEventListener\('hashchange'/);
  assert.match(script, /location\.hash === '#privacy'/);
  assert.match(script, /history\.replaceState\(history\.state/);
  assert.match(script, /typeof HTMLDialogElement !== 'undefined'/);
});
test('privacy: opening is read-only and cannot grant consent or send a request', () => {
  assert.doesNotMatch(script, /\b(?:fetch|XMLHttpRequest|submit|requestSubmit|reset)\s*\(/);
  assert.doesNotMatch(script, /localStorage\.|sessionStorage\.|\.checked\s*=/);
  assert.doesNotMatch(script, /location\.(?:href|assign|replace)\s*[=(]/);
  assert.match(script, /event\.preventDefault\(\)/);
});
test('privacy: closes on genuine backdrop clicks, not drags from text or scrollbar', () => {
  assert.match(script, /startedOnBackdrop && outside\(event\)/);
  assert.match(script, /event\.target === dialog/);
  assert.match(script, /pointercancel/);
});
test('privacy: normal flow is hidden and CSS supports no-JS reading and small screens', () => {
  assert.match(css, /:not\(\[open\]\) \{ display:none;/);
  assert.match(css, /:target:not\(\[open\]\)/);
  assert.match(css, /100dvh/);
  assert.match(css, /overflow-y:auto/);
  assert.match(css, /overscroll-behavior:contain/);
  assert.match(css, /focus-visible/);
});

test('privacy: Google reference URLs remain complete and allowlisted', () => {
  const text = 'policies.google.com/privacy/frameworks; policies.google.com/privacy.';
  const parts = privacyTextParts(text);
  assert.equal(parts.map(p => p.text).join(''), text);
  assert.deepEqual(parts.filter(p => p.href).map(p => p.href), [
    'https://policies.google.com/privacy/frameworks',
    'https://policies.google.com/privacy',
  ]);
  for (const locale of ['ru','it','en']) {
    const notice = json(`src/content/pages/${locale}/contacts.json`).privacy;
    for (const paragraph of notice.sections.flatMap(s => s.paragraphs)) {
      assert.equal(privacyTextParts(paragraph).map(p => p.text).join(''), paragraph);
    }
  }
});
