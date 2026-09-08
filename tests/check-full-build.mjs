/**
 * Check compiled Astro HTML after the build. No additional dependencies.
 *
 * Select the 15 public routes by output path, NOT by data-page alone:
 * BaseLayout also labels the noindex 404 and block-catalogue pages as "home".
 * Scanning every HTML file used to compare their headings with the home H1.
 *
 * Astro's directory output puts these files directly in dist, even when
 * BASE_PATH is /vikoma-group/. The base prefixes URLs, not the output tree.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const routePaths = {
  it: { home: '', about: 'azienda', services: 'servizi', events: 'eventi', contacts: 'contatti' },
  en: { home: 'en', about: 'en/about', services: 'en/services', events: 'en/events', contacts: 'en/contacts' },
  ru: { home: 'ru', about: 'ru/o-kompanii', services: 'ru/uslugi', events: 'ru/meropriyatiya', contacts: 'ru/kontakty' },
};

export const PUBLIC_PAGES = Object.freeze(
  Object.entries(routePaths).flatMap(([locale, pages]) =>
    Object.entries(pages).map(([kind, directory]) => Object.freeze({
      locale,
      kind,
      output: directory ? `${directory}/index.html` : 'index.html',
    })),
  ),
);

const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (value) => value
  .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => String.fromCodePoint(
    code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code),
  ))
  .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, name) => entities[name]);
const normalize = (value) => value.replace(/\s+/g, ' ').trim();
const textOf = (html) => normalize(decode(html.replace(/<[^>]*>/g, ' ')));

function attrs(source) {
  const result = Object.create(null);
  for (const match of source.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return result;
}

function countClass(html, name) {
  return [...html.matchAll(/<[a-z][a-z0-9:-]*\b([^>]*)>/gi)]
    .filter((match) => (attrs(match[1]).class || '').split(/\s+/).includes(name)).length;
}

/**
 * Validate all expected pages. Missing/mislabelled files are errors, never skips.
 * Exported so regression tests can exercise this exact checker on HTML fixtures.
 * @param {string} directory Compiled output directory.
 * @param {(message: string) => void} log Progress logger.
 * @returns {Promise<number>} Number of public pages successfully checked.
 */
export async function checkFullBuild(directory = 'dist', log = console.log) {
  const root = resolve(directory);
  for (const { locale, kind, output } of PUBLIC_PAGES) {
    const file = join(root, output);
    const context = `${file} (${locale}/${kind})`;
    let html;
    try {
      html = await readFile(file, 'utf8');
    } catch (error) {
      throw new Error(`${context}: cannot read required public page`, { cause: error });
    }

    const htmlTag = html.match(/<html\b([^>]*)>/i);
    assert.ok(htmlTag, `${context}: missing <html>`);
    const documentAttrs = attrs(htmlTag[1]);
    assert.equal(documentAttrs.lang, locale, `${context}: incorrect language`);
    assert.equal(documentAttrs['data-design'], 'balance', `${context}: expected Balance layout`);
    assert.doesNotMatch(html, /data-design-switcher|data-design-choice|src=["'][^"']*design-switcher/, `${context}: obsolete layout switcher`);
    for (const match of html.matchAll(/<a\b([^>]*)>/gi)) {
      assert.ok(!(attrs(match[1]).href || '').includes('/admin/'), `${context}: public admin link`);
    }
    for (const match of html.matchAll(/<meta\b([^>]*)>/gi)) {
      const meta = attrs(match[1]);
      if ((meta.name || '').toLowerCase() === 'robots') {
        assert.doesNotMatch(meta.content || '', /\bnoindex\b/i, `${context}: public page unexpectedly marked noindex`);
      }
    }

    const mains = [...html.matchAll(/<main\b([^>]*)>([\s\S]*?)<\/main>/gi)];
    assert.equal(mains.length, 1, `${context}: expected exactly one <main>`);
    assert.equal(attrs(mains[0][1])['data-page'], kind, `${context}: incorrect data-page`);
    const body = mains[0][2];
    const text = textOf(body);
    const page = JSON.parse(await readFile(
      new URL(`../src/content/pages/${locale}/${kind}.json`, import.meta.url), 'utf8',
    ));
    const headings = [...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
    assert.equal(headings.length, 1, `${context}: expected exactly one H1`);
    const expectedHeading = kind === 'home' ? page.hero.titleLines.join(' ') : page.title;
    assert.equal(textOf(headings[0][1]), normalize(expectedHeading), `${context}: incorrect H1`);

    const expectClass = (name, count) => assert.equal(countClass(body, name), count, `${context}: .${name} count`);
    const expectText = (value, label = value) => assert.ok(text.includes(normalize(value)), `${context}: missing text: ${label}`);
    const hasLead = !['home', 'contacts'].includes(kind);
    expectClass('page-header__lead', hasLead ? 1 : 0);
    if (hasLead) expectText(page.lead, 'page header lead');
    expectClass('contact-block', kind === 'home' ? 2 : kind === 'contacts' ? 0 : 1);

    if (kind === 'home') {
      expectClass('service-card', 2);
      expectClass('feature', 4);
      expectClass('home-belarus', 1);
      for (const paragraph of page.about.paragraphs) expectText(paragraph);
      expectClass('partner-detail', 2);
      expectText(page.hero.lead);
    }
    if (kind === 'services') {
      expectClass('service', 2);
      expectClass('step', 5);
      expectText(page.expertSupport.title);
    }
    if (kind === 'about') {
      expectClass('person', 3);
      expectClass('partner-detail', 2);
      for (const person of page.team.people) {
        expectText(person.name);
        expectText(person.about);
      }
    }
    if (kind === 'events') {
      const removedTopic = {
        ru: 'Презентации белорусских компаний',
        it: 'Presentazioni delle aziende bielorusse',
        en: 'Presentations by Belarusian companies with real needs for supplies, technologies and partnerships',
      }[locale];
      assert.ok(!text.includes(removedTopic), `${context}: removed company presentations returned`);
      expectClass('feature', 4);
      expectText(page.benefits.title);
      for (const item of page.benefits.items) {
        expectText(item.title);
        expectText(item.text);
      }
      expectText(page.programTitle);
      expectText(page.programNote);
      if (page.agenda) {
        expectText(page.benefits.subtitle);
        expectClass('feature-section__subtitle', 1);
        expectClass('program-format', 1);
        expectText(page.agenda.format);
        expectClass('program-group', 0);
        expectClass('program-bookend', 0);
        expectClass('program-list', 1);
        expectClass('program-item', 6);
        expectClass('program-optional', 1);
        expectClass('program-optional-item', 2);
        let previous = -1;
        for (const item of page.agenda.items) {
          expectText(item.title);
          const position = text.indexOf(normalize(item.title), previous + 1);
          assert.ok(position > previous, `${context}: programme items out of order`);
          previous = position;
          if (item.speaker) expectText(item.speaker);
          for (const paragraph of item.paragraphs) expectText(paragraph);
        }
        expectText(page.agenda.optionalTitle);
        for (const item of page.agenda.optionalItems) expectText(item);
      } else {
        expectClass('program-group', 3);
        expectClass('program-list', 0);
        expectClass('program-item', 0);
        expectClass('program-optional', 0);
        expectClass('program-optional-item', 0);
        for (const topic of page.program) expectText(topic);
      }
      expectClass('event-free', 2);
      expectText(page.durationValue);
      expectText('10:00');
      expectClass('page-header--compact', 1);
    }
    if (kind === 'contacts') {
      expectClass('contact-detail', 3);
      expectText(page.form.responseNote);
      expectText(page.form.title);
    }
    // Shared privacy UI lives outside main, and must never send visitors to
    // another page. Check the compiled output, not just component source text.
    const dialogs = [...html.matchAll(/<dialog\b([^>]*)>([\s\S]*?)<\/dialog>/gi)]
      .filter((match) => attrs(match[1]).id === 'privacy');
    assert.equal(dialogs.length, 1, `${context}: expected one privacy dialog`);
    assert.ok(!Object.hasOwn(attrs(dialogs[0][1]), 'open'), `${context}: privacy dialog must start closed`);
    assert.doesNotMatch(body, /id=["']privacy["']/, `${context}: privacy text returned to page body`);
    const notice = JSON.parse(await readFile(new URL(`../src/content/pages/${locale}/contacts.json`, import.meta.url), 'utf8')).privacy;
    // Preserve punctuation adjacent to inline contact links. The generic
    // textOf() inserts spaces around every tag and would invent 'email .'.
    const noticeText = normalize(decode(dialogs[0][2]
      .replace(/<\/(?:p|h[1-6]|div|section|header|footer)>/gi, ' ')
      .replace(/<[^>]*>/g, '')));
    for (const required of [notice.title, notice.text, ...notice.sections.flatMap(section => [section.title, ...section.paragraphs])]) {
      assert.ok(noticeText.includes(normalize(required)), `${context}: missing privacy notice text`);
    }
    if (notice.status !== 'published') assert.match(dialogs[0][2], /data-privacy-draft/, `${context}: privacy draft warning missing`);
    else assert.doesNotMatch(dialogs[0][2], /data-privacy-draft/, `${context}: unexpected privacy draft warning`);
    let privacyLinks = 0;
    for (const match of html.matchAll(/<a\b([^>]*)>/gi)) {
      const link = attrs(match[1]);
      if (Object.hasOwn(link, 'data-privacy-open') || (link.href || '').endsWith('#privacy')) {
        privacyLinks++;
        assert.equal(link.href, '#privacy', `${context}: privacy link must be local`);
        assert.ok(Object.hasOwn(link, 'data-privacy-open'), `${context}: privacy link trigger missing`);
        assert.equal(link['aria-controls'], 'privacy', `${context}: privacy link controls missing`);
      }
    }
    assert.ok(privacyLinks > 0, `${context}: privacy trigger missing`);
    const privacyScript = [...html.matchAll(/<script\b([^>]*)>/gi)].some(match => /\/scripts\/privacy-dialog\.js(?:[?#]|$)/.test(attrs(match[1]).src || ''));
    assert.ok(privacyScript, `${context}: privacy script missing`);
    log(`PASS ${locale}/${kind}: ${output}`);
  }
  log(`Full-site HTML checks passed: ${PUBLIC_PAGES.length} pages, Balance only.`);
  return PUBLIC_PAGES.length;
}

// Importing this module in node:test must not start a build-output scan.
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await checkFullBuild(process.argv[2] || 'dist');
}
