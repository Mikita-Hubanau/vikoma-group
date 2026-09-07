import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const text = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const obsolete = /data-design=['"](?:signature|editorial|atlas|panorama)['"]/;
test('Balance is the sole layout in configuration and runtime', () => {
 const config=JSON.parse(text('src/content/system/design.json'));
 assert.deepEqual(config,{defaultDesign:'balance',showSwitcher:false});
 assert.match(text('src/lib/design.ts'), /defaultDesign: 'balance'/);
 for(const file of ['src/lib/design.ts','public/scripts/design-switcher.js','src/layouts/BaseLayout.astro','src/styles/designs.css']) assert.doesNotMatch(text(file),obsolete,file);
 assert.doesNotMatch(text('src/components/Header.astro'),/DesignSwitcher/);
 assert.doesNotMatch(text('public/admin/config.yml'),/value: (?:signature|editorial|atlas|panorama)/);
});
test('the original white, grey, graphite and gold palette is retained', () => {
 const css=text('src/styles/designs.css');
 for(const colour of ['#8b692b','#c49a45','#1a1a1a','#fff','#f5f5f5']) assert.ok(css.includes(colour));
 assert.equal((css.match(/--accent:/g)||[]).length,1);
 assert.equal((css.match(/--button-bg:/g)||[]).length,1);
 assert.doesNotMatch(css,/(?:linear|radial)-gradient\(/);
});
test('Balance keeps text-left/map-right and paired service geometry', () => {
 const css=text('src/styles/designs.css');
 assert.ok(css.includes("[data-design='balance'] .hero__inner"));
 assert.ok(css.includes('minmax(0,1.15fr) minmax(0,1fr)'));
 assert.ok(css.includes('grid-template-columns: repeat(2,minmax(0,1fr))'));
 assert.doesNotMatch(text('src/components/WhatWeDo.astro'),/repeat\(4/);
});
test('obsolete layout switching and public edit links produce no UI', () => {
 assert.doesNotMatch(text('src/components/DesignSwitcher.astro'),/<button|<nav|<script/);
 assert.doesNotMatch(text('src/components/edit/EditButton.astro'),/<a|href=/);
 assert.doesNotMatch(text('src/components/Footer.astro'),/\/admin\//);
 assert.doesNotMatch(text('src/layouts/BaseLayout.astro'),/<EditMode|design-switcher|localStorage/);
});
test('mobile header has no empty layout-switcher row or clipping workaround', () => {
 const css=text('src/styles/designs.css');
 assert.ok(css.includes("grid-template-areas: 'logo lang' 'nav nav'"));
 assert.doesNotMatch(css,/overflow-x:\s*(?:clip|hidden)/);
 assert.match(css,/width: 200px; height: 200px; border-radius: 50%/);
});
