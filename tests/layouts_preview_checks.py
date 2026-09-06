"""Checks the supplied visual snapshot, NOT a compiled Astro site.
Usage: python tests/layouts_preview_checks.py /path/to/VIKUB-layout-preview.html
Requires Python, Playwright and Chromium. No Internet access or service accounts.
"""
from pathlib import Path
import argparse, json, os, re, shutil, unittest
from playwright.sync_api import sync_playwright
parser = argparse.ArgumentParser()
parser.add_argument('preview', type=Path)
args = parser.parse_args()
source = args.preview.read_text(encoding='utf-8')
docs = json.loads(source.split('const docs=', 1)[1].split(';\nconst frame=', 1)[0])
LAYOUTS = ['signature', 'balance', 'editorial', 'atlas', 'panorama']
def static(s): return re.sub(r'<script\b[^>]*>[\s\S]*?</script>', '', s)

class LayoutPreviewChecks(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pw = sync_playwright().start()
  cls.browser = cls.pw.chromium.launch(executable_path=os.environ.get('BROWSER_EXECUTABLE') or shutil.which('chromium'), args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls): cls.browser.close(); cls.pw.stop()
 def setUp(self):
  self.ctx = self.browser.new_context(viewport={'width':1440, 'height':1100}, reduced_motion='reduce')
  self.page = self.ctx.new_page(); self.page.set_default_timeout(4000)
  self.errors = []; self.page.on('pageerror', lambda e: self.errors.append(str(e)))
 def tearDown(self): self.ctx.close(); self.assertEqual(self.errors, [])
 def test_one_computed_palette_on_all_five_layouts(self):
  self.page.set_content(static(docs['/']))
  values = []
  for id in LAYOUTS:
   self.page.evaluate('(id)=>document.documentElement.dataset.design=id', id)
   values.append(self.page.evaluate('''()=>{let s=getComputedStyle(document.documentElement);return ['--paper','--paper-2','--ink','--accent','--accent-light','--button-bg','--button-text'].map(k=>s.getPropertyValue(k).trim());}'''))
  self.assertTrue(all(v == values[0] for v in values)); self.assertIn('#c49a45', values[0])
 def test_five_distinct_desktop_hero_geometries(self):
  self.page.set_content(static(docs['/']))
  boxes = {}
  for id in LAYOUTS:
   self.page.evaluate('(id)=>document.documentElement.dataset.design=id', id)
   boxes[id] = self.page.evaluate('''()=>Object.fromEntries(['h1','.hero__lead','.hero__figure'].map(sel=>{let r=document.querySelector(sel).getBoundingClientRect();return [sel,{x:r.x,y:r.y,right:r.right,bottom:r.bottom}]}))''')
  b=boxes['signature']; self.assertGreater(b['.hero__figure']['y'], b['.hero__lead']['bottom'])
  b=boxes['balance']; self.assertGreater(b['.hero__figure']['x'], b['h1']['right'])
  b=boxes['editorial']; self.assertLess(b['h1']['bottom'], b['.hero__lead']['y']); self.assertGreater(b['.hero__figure']['x'], b['.hero__lead']['right'])
  b=boxes['atlas']; self.assertLess(b['.hero__figure']['right'], b['h1']['x'])
  b=boxes['panorama']; self.assertLess(b['h1']['bottom'], b['.hero__figure']['y']); self.assertLess(b['.hero__figure']['right'], b['.hero__lead']['x'])
  self.assertEqual(len({json.dumps(b, sort_keys=True) for b in boxes.values()}), 5)
 def test_mobile_header_targets_and_no_overlap(self):
  for width in [320,375,390,640,768,1024,1440]:
   self.page.set_viewport_size({'width':width,'height':1100}); self.page.set_content(static(docs['/ru/']))
   findings=self.page.evaluate('''()=>{let rect=s=>document.querySelector(s).getBoundingClientRect();let l=rect('.logo'),t=rect('.site-header__lang'),d=rect('.design-switcher');return {overlap:Math.min(l.right,t.right)>Math.max(l.left,t.left)&&Math.min(l.bottom,t.bottom)>Math.max(l.top,t.top),below:d.top>=t.bottom,targets:[...document.querySelectorAll('[data-design-choice]')].map(e=>{let r=e.getBoundingClientRect();return [r.width,r.height]})}}''')
   self.assertFalse(findings['overlap'],width); self.assertTrue(findings['below'],width)
   self.assertTrue(all(w>=44 and h>=44 for w,h in findings['targets']),width)
 def test_text_and_requested_form_fields_are_not_swapped_between_layouts(self):
  for route in docs:
   self.page.set_content(static(docs[route])); baseline=self.page.locator('#main').text_content()
   for id in LAYOUTS:
    self.page.evaluate('(id)=>document.documentElement.dataset.design=id',id)
    self.assertEqual(self.page.locator('#main').text_content(),baseline)
    self.assertEqual(self.page.locator('h1').count(),1)
  self.page.set_content(static(docs['/ru/meropriyatiya/']))
  for name in ['first_name','last_name','company','email','phone']:
   self.assertEqual(self.page.locator(f'[name="{name}"]').count(),1)
 def test_wrapper_switches_pages_languages_and_keeps_layout(self):
  self.page.set_content(source); f=self.page.frame_locator('#site')
  for id in LAYOUTS:
   f.locator(f'[data-design-choice="{id}"]').click()
   self.assertEqual(f.locator('html').get_attribute('data-design'),id)
   self.assertEqual(f.locator('[aria-pressed="true"]').count(),1)
  self.page.select_option('#language','ru')
  f.locator('html[lang="ru"][data-design="panorama"]').wait_for()
  self.page.select_option('#page','3')
  f.locator('#main[data-page="events"]').wait_for()
  self.assertEqual(f.locator('html').get_attribute('data-design'),'panorama')
  f.locator('a[href="#registration"]').click()
  self.assertLess(f.locator('#registration').bounding_box()['y'],1000)
  self.page.locator('#reset').click(); f.locator('html[data-design="signature"]').wait_for()
  self.page.locator('#viewport').click(); self.assertEqual(round(self.page.locator('#site').bounding_box()['width']),390)
 def test_switcher_buttons_are_keyboard_operable_in_preview(self):
  self.page.set_content(source); f=self.page.frame_locator('#site')
  f.locator('[data-design-choice="editorial"]').focus(); self.page.keyboard.press('Enter')
  self.assertEqual(f.locator('html').get_attribute('data-design'),'editorial')
  f.locator('[data-design-choice="atlas"]').focus(); self.page.keyboard.press('Space')
  self.assertEqual(f.locator('html').get_attribute('data-design'),'atlas')

if __name__ == '__main__': unittest.main(argv=['layouts_preview_checks'], verbosity=2)
