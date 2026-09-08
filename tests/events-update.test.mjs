import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { eventContentIssues, eventSharedFields } from '../src/lib/events-content.mjs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const json = (path) => JSON.parse(read(path));
const approved = json('tests/fixtures/events-copy.json');
const event = (locale) => json(`src/content/pages/${locale}/events.json`);

for (const locale of ['ru', 'it']) {
  test(`${locale}: seminar copy matches the supplied text in full`, () => {
    const page = event(locale);
    for (const key of ['benefits', 'programTitle', 'programNote', 'agenda']) {
      assert.deepEqual(page[key], approved[locale][key], `${locale}/${key}`);
    }
    assert.equal(page.program, undefined, 'Do not retain a second, outdated copy');
    assert.equal(page.programGroups, undefined, 'The replaced groups must be removed');
    assert.deepEqual(eventContentIssues(page), []);
  });
  test(`${locale}: two legal perspectives remain separate paragraphs`, () => {
    const item = event(locale).agenda.items[2];
    assert.equal(item.paragraphs.length, 2);
    assert.ok(item.speaker);
    assert.equal(item.paragraphs[0], approved[locale].agenda.items[2].paragraphs[0]);
    assert.equal(item.paragraphs[1], approved[locale].agenda.items[2].paragraphs[1]);
  });
  const mutations = [
    ['missing benefit', p => p.benefits.items.pop()],
    ['empty benefit title', p => { p.benefits.items[1].title = '   '; }],
    ['missing benefits subtitle', p => { delete p.benefits.subtitle; }],
    ['empty format note', p => { p.agenda.format = ''; }],
    ['five main items', p => p.agenda.items.pop()],
    ['seven main items', p => p.agenda.items.push(structuredClone(p.agenda.items[0]))],
    ['empty programme title', p => { p.agenda.items[0].title = ' '; }],
    ['no programme description', p => { p.agenda.items[2].paragraphs = []; }],
    ['blank programme paragraph', p => { p.agenda.items[2].paragraphs[1] = '\n '; }],
    ['missing optional label', p => { delete p.agenda.optionalTitle; }],
    ['only one optional item', p => p.agenda.optionalItems.pop()],
    ['three optional items', p => p.agenda.optionalItems.push('Extra')],
    ['blank optional item', p => { p.agenda.optionalItems[0] = ''; }],
    ['duplicate legacy programme', p => { p.program = ['Old list']; }],
    ['duplicate legacy groups', p => { p.programGroups = [{title:'Old group',indices:[0]}]; }],
    ['missing organiser note', p => { delete p.programNote; }],
  ];
  for (const [name, mutate] of mutations) {
    test(`${locale}: content validation rejects ${name}`, () => {
      const page = event(locale);
      mutate(page);
      assert.ok(eventContentIssues(page).length > 0, name);
    });
  }
}

test('English event content keeps its grouped format without company presentations', () => {
  const page = event('en');
  assert.equal(page.agenda, undefined);
  assert.equal(page.benefits.subtitle, undefined);
  assert.equal(page.program.length, 7);
  assert.equal(page.programGroups.length, 3);
  assert.deepEqual(eventContentIssues(page), []);
  page.programGroups[0].indices.push(1);
  assert.ok(eventContentIssues(page).length > 0, 'Duplicate legacy items must still fail');
});

test('only the intentionally different agenda shape is excluded from shared keys', () => {
  for (const locale of ['ru','it','en']) {
    const page = event(locale), shared = eventSharedFields(page);
    assert.equal(shared.agenda, undefined);
    assert.equal(shared.program, undefined);
    assert.equal(shared.programGroups, undefined);
    assert.equal(shared.benefits.subtitle, undefined);
    for (const key of ['registration','seo','audience']) assert.deepEqual(shared[key], page[key]);
    assert.deepEqual(shared.benefits.items, page.benefits.items);
  }
});

test('the real Astro view renders escaped content and separates optional items', () => {
  const view = read('src/views/EventsView.astro');
  assert.match(view, /<ol class="program-list">[\s\S]*agenda\.items\.map/);
  assert.match(view, /<\/ol>\s*<section class="program-optional"/);
  assert.match(view, /aria-labelledby="program-optional-title"/);
  assert.match(view, /<h3 id="program-optional-title">\{agenda\.optionalTitle\}/);
  assert.match(view, /agenda\.optionalItems\.map/);
  assert.match(view, /item\.speaker && <p class="program-speaker"/);
  assert.match(view, /item\.paragraphs\.map/);
  assert.doesNotMatch(view, /set:html/);
});

test('new copy remains CMS-managed and is part of schema and prebuild validation', () => {
  const schema = read('src/content.config.ts');
  assert.match(schema, /agenda: z\.object\(/);
  assert.match(schema, /eventContentIssues\(page\)/);
  assert.match(read('scripts/check-site.mjs'), /eventContentIssues\(data\)/);
  const cms = read('public/admin/config.yml').split('  - name: events\n')[1].split('  - name: contacts\n')[0];
  for (const field of ['agenda','format','speaker','paragraphs','optionalTitle','optionalItems','subtitle']) {
    assert.match(cms, new RegExp(`- name: ${field}\\n`), field);
  }
});

test('the removed presentation topic is absent from every translated programme', () => {
  for (const [locale, title] of [
    ['ru', 'Презентации белорусских компаний'],
    ['it', 'Presentazioni delle aziende bielorusse'],
    ['en', 'Presentations by Belarusian companies'],
  ]) {
    assert.ok(!JSON.stringify(event(locale)).includes(title), locale);
  }
  // The different English NAIP topic is not the deleted presentation session.
  assert.ok(event('en').program.includes('Specific requests from Belarusian businesses across five sectors — NAIP representatives'));
  assert.deepEqual(event('en').programGroups.flatMap(g => g.indices), [1,2,3,4,5]);
});
