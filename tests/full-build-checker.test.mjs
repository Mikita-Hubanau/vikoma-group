/**
 * Regression tests for the postbuild checker, using intentionally synthetic
 * HTML. These test the checker itself; they do NOT replace an Astro build.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { PUBLIC_PAGES, checkFullBuild } from './check-full-build.mjs';
import { locales, defaultLocale } from '../locales.config.mjs';

const escape = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const paragraphs = (values) => values.map((value) => `<p>${escape(value)}</p>`).join('');
const blocks = (name, count) => `<div class="${name}"></div>`.repeat(count);
const quiet = () => {};
const home404 = '<!doctype html><html lang="it" data-design="balance"><head><meta name="robots" content="noindex, nofollow"></head><body><main data-page="home"><h1>404</h1></main></body></html>';

async function fixturePage({ locale, kind }) {
  const page = JSON.parse(await readFile(new URL(`../src/content/pages/${locale}/${kind}.json`, import.meta.url), 'utf8'));
  let body = `<h1>${escape(kind === 'home' ? page.hero.titleLines.join(' ') : page.title)}</h1>`;
  if (!['home', 'contacts'].includes(kind)) body += `<p class="page-header__lead">${escape(page.lead)}</p>`;
  body += blocks('contact-block', kind === 'home' ? 2 : kind === 'contacts' ? 0 : 1);
  if (kind === 'home') {
    body += blocks('service-card', 2) + blocks('feature', 4) + blocks('home-belarus', 1) + blocks('partner-detail', 2);
    body += paragraphs([...page.about.paragraphs, page.hero.lead]);
  }
  if (kind === 'services') body += blocks('service', 2) + blocks('step', 5) + paragraphs([page.expertSupport.title]);
  if (kind === 'about') {
    body += blocks('person', 3) + blocks('partner-detail', 2);
    body += paragraphs(page.team.people.flatMap((person) => [person.name, person.about]));
  }
  if (kind === 'events') {
    body += blocks('feature', 4) + blocks('event-free', 2) + blocks('page-header--compact', 1);
    body += paragraphs([page.benefits.title, ...page.benefits.items.flatMap(item => [item.title, item.text]), page.programTitle, page.programNote]);
    if (page.agenda) {
      body += `<p class="feature-section__subtitle">${escape(page.benefits.subtitle)}</p>`;
      body += `<p class="program-format">${escape(page.agenda.format)}</p>`;
      body += '<ol class="program-list">' + page.agenda.items.map(item =>
        '<li class="program-item">' + paragraphs([item.title, ...(item.speaker ? [item.speaker] : []), ...item.paragraphs]) + '</li>').join('') + '</ol>';
      body += '<section class="program-optional">' + paragraphs([page.agenda.optionalTitle]);
      body += '<ul>' + page.agenda.optionalItems.map(item => `<li class="program-optional-item">${escape(item)}</li>`).join('') + '</ul></section>';
    } else {
      body += blocks('program-group', 3) + paragraphs(page.program);
    }
    body += paragraphs([page.durationValue, '10:00']);
  }
  if (kind === 'contacts') body += blocks('contact-detail', 3) + paragraphs([page.form.responseNote, page.form.title]);
  const notice = JSON.parse(await readFile(new URL(`../src/content/pages/${locale}/contacts.json`, import.meta.url), 'utf8')).privacy;
  const privacy = `<dialog id="privacy"><h2>${escape(notice.title)}</h2><p>${escape(notice.text)}</p>`
    + (notice.status !== 'published' ? `<p data-privacy-draft>${escape(notice.reviewNote)}</p>` : '')
    + paragraphs(notice.sections.flatMap(section => [section.title, ...section.paragraphs])) + '</dialog>'
    + '<a href="#privacy" data-privacy-open aria-controls="privacy">Privacy</a><script type="module" src="/scripts/privacy-dialog.js"></script>';
  return `<!doctype html><html lang="${locale}" data-design="balance"><head><title>Checker test fixture</title></head><body><main data-page="${kind}">${body}</main>${privacy}</body></html>`;
}

async function createFixture(t, base = '/') {
  const root = await mkdtemp(join(tmpdir(), 'vikub-full-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const page of PUBLIC_PAGES) {
    const file = join(root, page.output);
    await mkdir(dirname(file), { recursive: true });
    const html = (await fixturePage(page)).replace('<body>', `<body><a href="${base}">Home</a>`);
    await writeFile(file, html);
  }
  return root;
}

async function mutate(root, output, change) {
  const file = join(root, output);
  const before = await readFile(file, 'utf8');
  const after = change(before);
  assert.notEqual(after, before, 'The regression test must actually change the fixture');
  await writeFile(file, after);
}

test('the checker lists exactly the 15 real translated page wrappers', async () => {
  assert.equal(defaultLocale, 'it');
  assert.deepEqual([...new Set(PUBLIC_PAGES.map((page) => page.locale))], locales);
  assert.equal(PUBLIC_PAGES.length, 15);
  assert.equal(new Set(PUBLIC_PAGES.map((page) => page.output)).size, 15);
  const views = { home: 'Home', about: 'About', services: 'Services', events: 'Events', contacts: 'Contacts' };
  for (const { locale, kind, output } of PUBLIC_PAGES) {
    const sourcePath = output === 'index.html' || /^(en|ru)\/index\.html$/.test(output)
      ? output.replace(/\.html$/, '.astro')
      : output.replace(/\/index\.html$/, '.astro');
    const source = await readFile(new URL(`../src/pages/${sourcePath}`, import.meta.url), 'utf8');
    assert.match(source, new RegExp(`<${views[kind]}View\\s+locale="${locale}"`), sourcePath);
  }
  const config = await readFile(new URL('../astro.config.mjs', import.meta.url), 'utf8');
  assert.match(config, /build:\s*\{\s*format:\s*'directory'/);
});

for (const base of ['/', '/vikoma-group/']) {
  test(`all 15 public pages pass with base ${base}; 404 and system pages are ignored`, async (t) => {
    const root = await createFixture(t, base);
    // These share BaseLayout's default home marker but are not public home routes.
    await writeFile(join(root, '404.html'), home404);
    for (const path of ['404/index.html', 'blocks/index.html', 'admin/index.html', 'it/index.html', 'preview/index.html']) {
      const file = join(root, path);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, home404.replace('<h1>404</h1>', '<h1>System page</h1>'));
    }
    const logs = [];
    assert.equal(await checkFullBuild(root, (line) => logs.push(line)), 15);
    assert.equal(logs.filter((line) => line.startsWith('PASS ')).length, 15);
  });
}

// A valid-looking duplicate or an alias must never hide a missing real page.
for (const page of PUBLIC_PAGES) {
  test(`missing ${page.output} is an error even when a duplicate exists elsewhere`, async (t) => {
    const root = await createFixture(t);
    const original = await readFile(join(root, page.output), 'utf8');
    await mkdir(join(root, 'duplicate'), { recursive: true });
    await writeFile(join(root, 'duplicate/index.html'), original);
    await rm(join(root, page.output));
    await assert.rejects(checkFullBuild(root, quiet), (error) =>
      error.message.includes(page.output) && error.message.includes('cannot read required public page'));
  });
}

test('a 404 served at the actual home output is still a build error', async (t) => {
  const root = await createFixture(t);
  // Deliberately remove noindex: the real H1 check itself must catch the 404.
  await writeFile(join(root, 'index.html'), home404.replace('<meta name="robots" content="noindex, nofollow">', ''));
  await assert.rejects(checkFullBuild(root, quiet), /incorrect H1/);
});

const regressions = [
  ['removed company presentations', 'ru/meropriyatiya/index.html', html => html.replace('</main>', '<p>Презентации белорусских компаний</p></main>'), /removed company presentations returned/],
  ['missing privacy dialog', 'eventi/index.html', html => html.replace(/<dialog[\s\S]*?<\/dialog>/, ''), /expected one privacy dialog/],
  ['initially open privacy dialog', 'contatti/index.html', html => html.replace('<dialog id="privacy">', '<dialog id="privacy" open>'), /must start closed/],
  ['cross-page privacy link', 'ru/meropriyatiya/index.html', html => html.replace('href="#privacy"', 'href="/ru/kontakty/#privacy"'), /privacy link must be local/],
  ['missing privacy script', 'index.html', html => html.replace('/scripts/privacy-dialog.js', '/scripts/other.js'), /privacy script missing/],
  ['unexpected privacy draft warning', 'en/events/index.html', html => html.replace('<dialog id="privacy">', '<dialog id="privacy"><p data-privacy-draft>Old draft warning</p>'), /unexpected privacy draft warning/],

  ['wrong H1', 'index.html', (html) => html.replace(/<h1>[^<]*<\/h1>/, '<h1>Wrong title</h1>'), /incorrect H1/],
  ['missing H1', 'index.html', (html) => html.replace(/<h1>[^<]*<\/h1>/, ''), /exactly one H1/],
  ['duplicate H1', 'index.html', (html) => html.replace('</main>', '<h1>Extra</h1></main>'), /exactly one H1/],
  ['missing main', 'index.html', (html) => html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/, ''), /exactly one <main>/],
  ['duplicate main', 'index.html', (html) => html.replace('</body>', '<main data-page="home"></main></body>'), /exactly one <main>/],
  ['missing data-page', 'index.html', (html) => html.replace('data-page="home"', ''), /incorrect data-page/],
  ['wrong data-page', 'index.html', (html) => html.replace('data-page="home"', 'data-page="contacts"'), /incorrect data-page/],
  ['wrong language', 'index.html', (html) => html.replace('lang="it"', 'lang="en"'), /incorrect language/],
  ['wrong layout', 'index.html', (html) => html.replace('data-design="balance"', 'data-design="atlas"'), /expected Balance/],
  ['public page marked noindex', 'index.html', (html) => html.replace('</head>', '<meta content="noindex" name="robots"></head>'), /unexpectedly marked noindex/],
  ['returned layout switcher', 'index.html', (html) => html.replace('</body>', '<div data-design-switcher></div></body>'), /obsolete layout switcher/],
  ['public admin link', 'index.html', (html) => html.replace('</body>', '<a href="/vikoma-group/admin/">Edit</a></body>'), /public admin link/],
  ['missing home CTA', 'index.html', (html) => html.replace('<div class="contact-block"></div>', ''), /contact-block count/],
  ['missing home card', 'index.html', (html) => html.replace('<div class="service-card"></div>', ''), /service-card count/],
  ['missing services step', 'servizi/index.html', (html) => html.replace('<div class="step"></div>', ''), /step count/],
  ['missing team member', 'azienda/index.html', (html) => html.replace('<div class="person"></div>', ''), /person count/],
  ['missing English event group', 'en/events/index.html', (html) => html.replace('<div class="program-group"></div>', ''), /program-group count/],
  ['missing main agenda item', 'eventi/index.html', (html) => html.replace('<li class="program-item">', '<li>'), /program-item count/],
  ['missing optional item', 'ru/meropriyatiya/index.html', (html) => html.replace('<li class="program-optional-item">', '<li>'), /program-optional-item count/],
  ['missing benefits subtitle', 'eventi/index.html', (html) => html.replace(/<p class="feature-section__subtitle">[^<]*<\/p>/, ''), /missing text|feature-section__subtitle count/],
  ['missing programme format', 'ru/meropriyatiya/index.html', (html) => html.replace(/<p class="program-format">[^<]*<\/p>/, ''), /program-format count|missing text/],
  ['missing optional-time warning', 'ru/meropriyatiya/index.html', (html) => html.replace('Опционально (по возможности, не входит в основное время):', 'Опционально'), /missing text/],
  ['missing legal paragraph', 'eventi/index.html', (html) => html.replace(/<p>Avvocati bielorussi:.*?<\/p>/, ''), /missing text/],
  ['missing contact detail', 'contatti/index.html', (html) => html.replace('<div class="contact-detail"></div>', ''), /contact-detail count/],
];
for (const [name, output, change, error] of regressions) {
  test(`checker still rejects ${name}`, async (t) => {
    const root = await createFixture(t);
    await mutate(root, output, change);
    await assert.rejects(checkFullBuild(root, quiet), error);
  });
}

test('all three localized home headings are actually checked', async (t) => {
  for (const output of ['index.html', 'en/index.html', 'ru/index.html']) {
    const root = await createFixture(t);
    await mutate(root, output, (html) => html.replace(/<h1>[^<]*<\/h1>/, '<h1>404</h1>'));
    await assert.rejects(checkFullBuild(root, quiet), /incorrect H1/);
  }
});

test('scoped classes, quoted attributes and escaped heading punctuation are supported', async (t) => {
  const root = await createFixture(t);
  for (const { output } of PUBLIC_PAGES) {
    await mutate(root, output, (html) => html
      .replace(/<h1>([^<]*)<\/h1>/, (_, heading) => `<h1><span>${heading.replace(/’/g, '&#x2019;')}</span></h1>`)
      .replace(/class="([^"]+)"/g, "class='$1 extra-class' data-astro-cid-test")
      .replace(/(lang|data-design|data-page)="([^"]+)"/g, "$1 = '$2'"));
  }
  assert.equal(await checkFullBuild(root, quiet), 15);
});

test('CLI accepts an explicit dist path and exits successfully with a 404 alongside it', async (t) => {
  const root = await createFixture(t);
  await writeFile(join(root, '404.html'), home404);
  const script = fileURLToPath(new URL('./check-full-build.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [script, resolve(root)], { cwd: tmpdir(), encoding: 'utf8', timeout: 10_000 });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Full-site HTML checks passed: 15 pages, Balance only\./);
});

test('CLI default dist path fails when the actual homepage is a 404', async (t) => {
  const root = await createFixture(t);
  const work = await mkdtemp(join(tmpdir(), 'vikub-checker-cli-'));
  t.after(() => rm(work, { recursive: true, force: true }));
  // Copy the fixture tree under a literal dist/ to exercise npm's invocation.
  const { cp } = await import('node:fs/promises');
  await cp(root, join(work, 'dist'), { recursive: true });
  await writeFile(join(work, 'dist/index.html'), home404.replace('<meta name="robots" content="noindex, nofollow">', ''));
  const script = fileURLToPath(new URL('./check-full-build.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [script], { cwd: work, encoding: 'utf8', timeout: 10_000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /incorrect H1/);
});

for (const output of ['eventi/index.html', 'ru/meropriyatiya/index.html']) {
  test(`checker rejects reordered seminar agenda at ${output}`, async (t) => {
    const root = await createFixture(t);
    await mutate(root, output, (html) => html.replace(
      /(<li class="program-item">[\s\S]*?<\/li>)(<li class="program-item">[\s\S]*?<\/li>)/,
      '$2$1',
    ));
    await assert.rejects(checkFullBuild(root, quiet), /out of order/);
  });
}

test('privacy checker preserves punctuation next to safe inline email links', async (t) => {
  const root = await createFixture(t);
  for (const {output} of PUBLIC_PAGES) {
    await mutate(root, output, html => html.replaceAll('info@vikub.com', '<a href="mailto:info@vikub.com">info@vikub.com</a>'));
  }
  assert.equal(await checkFullBuild(root, quiet), 15);
});
