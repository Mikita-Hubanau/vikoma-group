import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const text = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const ids = ['signature', 'balance', 'editorial', 'atlas', 'panorama'];

test('layout order matches the client bootstrap, UI, validator and CMS', () => {
 for (const file of ['src/lib/design.ts', 'public/scripts/design-switcher.js', 'src/layouts/BaseLayout.astro', 'scripts/check-site.mjs']) {
  const source = text(file);
  const list = source.match(/\['signature',\s*'balance',\s*'editorial',\s*'atlas',\s*'panorama'\]/);
  assert.ok(list, file + ' has the same allowlist');
 }
 const cms = text('public/admin/config.yml').split('  - name: design\n')[1];
 assert.deepEqual([...cms.matchAll(/value: (\w+)/g)].map(m => m[1]), ids);
 assert.match(cms, /default: signature/);
});
test('one Signature palette is declared once for all five layouts', () => {
 const css = text('src/styles/designs.css');
 const root = css.match(/html#vikub-site\[data-design\] \{([^}]+)\}/s)[1];
 for (const colour of ['#8b692b', '#c49a45', '#1a1a1a', '#fff', '#f5f5f5']) assert.ok(root.includes(colour));
 assert.equal((css.match(/--accent:/g) || []).length, 1);
 assert.equal((css.match(/--button-bg:/g) || []).length, 1);
 assert.doesNotMatch(css, /#(?:b85c4b|a2482b|627147|8a9a6b|a34f41)\b/i);
 assert.doesNotMatch(css, /(?:linear|radial)-gradient\(/);
});
test('each layout has its own hero and services geometry', () => {
 const css = text('src/styles/designs.css');
 for (const id of ids) {
  assert.ok(css.includes(`[data-design='${id}'] .hero__inner`), id);
  assert.ok(css.includes(`[data-design='${id}'] .service-card`), id);
 }
 assert.match(css, /grid-template-areas: 'map copy'/);
 assert.match(css, /grid-template-areas: 'kicker title title'/);
 assert.match(css, /grid-template-areas: 'kicker kicker'/);
});
test('switcher includes five wireframes, meaningful names and touch targets', () => {
 const source = text('src/components/DesignSwitcher.astro');
 for (const id of ids) assert.ok(source.includes(id + ': [['));
 assert.match(source, /min-height:52px/);
 assert.match(source, /aria-pressed=/);
 assert.match(source, /aria-live="polite"/);
 assert.match(source, /aria-hidden="true" focusable="false"/);
});
test('mobile layout restores the header grid without CSS clipping fixes', () => {
 const css = text('src/styles/designs.css');
 assert.ok(css.includes("grid-template-areas: 'logo lang' 'layouts layouts' 'nav nav'"));
 assert.ok(css.includes('.about-summary__text { grid-template-columns: minmax(0,1fr); }'));
 assert.doesNotMatch(css, /overflow-x:\s*(?:clip|hidden)/);
});
