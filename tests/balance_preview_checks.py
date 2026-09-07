"""Checks source-based offline fixtures, NOT a compiled Astro build.
Run: python tests/balance_preview_checks.py [preview/VIKUB-layout-preview.html]
Requires Playwright and Chromium. Does not submit forms or make network requests.
"""
from pathlib import Path
import json,re,os,shutil,sys,unittest
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
PREVIEW=Path(sys.argv[1]) if len(sys.argv)>1 else R/'preview/VIKUB-layout-preview.html'
DOCS=json.loads(PREVIEW.read_text().split('const docs=',1)[1].split(';\nconst frame=',1)[0])
class BalancePreviewChecks(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pw=sync_playwright().start();cls.browser=cls.pw.chromium.launch(executable_path=os.environ.get('BROWSER_EXECUTABLE') or shutil.which('chromium'),args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.pw.stop()
 def setUp(self):self.page=self.browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
 def tearDown(self):self.page.close()
 def show(self,source):self.page.set_content(re.sub(r'<script\b[^>]*>[\s\S]*?</script>','',source))
 def test_fifteen_pages_balance_only_no_public_admin_or_telegram(self):
  self.assertEqual(len(DOCS),15)
  for route,source in DOCS.items():
   self.show(source);self.assertEqual(self.page.locator('html').get_attribute('data-design'),'balance')
   self.assertEqual(self.page.locator('h1').count(),1)
   self.assertEqual(self.page.locator('[data-design-switcher],a[href*="/admin/"]').count(),0)
   self.assertNotIn('Telegram',self.page.locator('body').inner_text())
 def test_sixty_viewports_have_no_horizontal_page_overflow(self):
  for route,source in DOCS.items():
   for width in [320,375,768,1440]:
    self.page.set_viewport_size({'width':width,'height':1000});self.show(source)
    self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(route,width))
 def test_home_has_two_ctas_two_services_and_four_benefits(self):
  for route,source in DOCS.items():
   self.show(source)
   if self.page.locator('main').get_attribute('data-page')!='home':continue
   for selector,count in [('.contact-block',2),('.service-card',2),('.feature',4),('.about-summary__text p',3),('.home-belarus',1)]:self.assertEqual(self.page.locator(selector).count(),count,route)
 def test_headers_obey_the_contacts_exception(self):
  for route,source in DOCS.items():
   self.show(source);kind=self.page.locator('main').get_attribute('data-page')
   self.assertEqual(self.page.locator('.page-header__lead').count(),0 if kind in ['home','contacts'] else 1,route)
 def test_three_team_portraits_have_200px_circular_slots(self):
  for route,source in DOCS.items():
   self.show(source)
   if self.page.locator('main').get_attribute('data-page')!='about':continue
   self.assertEqual(self.page.locator('.person').count(),3)
   for box in self.page.locator('.person__initials').evaluate_all('nodes=>nodes.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,r:getComputedStyle(e).borderRadius}))'):
    self.assertEqual(box,{'w':200,'h':200,'r':'50%'})
 def test_events_have_three_groups_four_benefits_two_free_badges(self):
  for route,source in DOCS.items():
   self.show(source)
   if self.page.locator('main').get_attribute('data-page')!='events':continue
   for selector,count in [('.program-group',3),('.feature',4),('.event-free',2),('.page-header--compact',1)]:self.assertEqual(self.page.locator(selector).count(),count)
   self.assertEqual(self.page.locator('a.event-free').count(),0)
 def test_contacts_required_fields_and_native_phone_pattern(self):
  for route,source in DOCS.items():
   self.show(source)
   if self.page.locator('main').get_attribute('data-page')!='contacts':continue
   self.assertEqual(self.page.locator('form [required]').evaluate_all('nodes=>nodes.map(x=>x.name)'),['name','email','phone','company','service','message','consent'])
   self.assertEqual(self.page.locator('[name=service] option').count(),9)
   field=self.page.locator('[name=phone]');field.fill('+39 328 2303160');self.assertTrue(field.evaluate('e=>e.checkValidity()'));field.fill('letters');self.assertFalse(field.evaluate('e=>e.checkValidity()'))
   self.assertEqual(self.page.locator('.contact-response-note').count(),1)
 def test_footer_contact_links_are_present(self):
  for route,source in DOCS.items():
   self.show(source)
   for href in ['tel:+393282303160','tel:+375296409880','mailto:info@vikub.com']:
    self.assertEqual(self.page.locator(f'footer a[href="{href}"]').count(),1,route)
def main():unittest.main(argv=['balance_preview_checks'],verbosity=2)
if __name__=='__main__':main()
