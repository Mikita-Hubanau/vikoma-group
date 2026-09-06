"""Regression checks of the self-contained source snapshot, not a compiled Astro site.
Usage: python tests/brand_preview_checks.py preview/VIKUB-layout-preview.html
"""
from pathlib import Path
import argparse, json, re, os, shutil, unittest
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('preview',type=Path);args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
source=args.preview.read_text()
docs=json.loads(source.split('const docs=',1)[1].split(';\nconst frame=',1)[0])
LAYOUTS=['signature','balance','editorial','atlas','panorama']
def data(path):return json.loads((root/path).read_text())
class BrandPreviewChecks(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pw=sync_playwright().start();cls.browser=cls.pw.chromium.launch(executable_path=os.environ.get('BROWSER_EXECUTABLE') or shutil.which('chromium'),args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.pw.stop()
 def setUp(self):self.page=self.browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce');self.page.set_default_timeout(4000)
 def tearDown(self):self.page.close()
 def load(self,doc):self.page.set_content(re.sub(r'<script\b[^>]*>[\s\S]*?</script>','',doc))
 def test_all_fifteen_pages_load_both_logos_without_font_dependency(self):
  for route,doc in docs.items():
   self.load(doc)
   result=self.page.evaluate('''async()=>{const imgs=[...document.querySelectorAll('.logo img,.site-footer__brand img')];for(const i of imgs){i.loading='eager';await i.decode();}return imgs.map(i=>({alt:i.alt,ok:i.complete&&i.naturalWidth===1705,ratio:i.width/i.height}));}''')
   self.assertEqual(len(result),2,route)
   self.assertTrue(all(r['alt']=='VIKUB' and r['ok'] and 4.4<r['ratio']<4.8 for r in result),route)
 def test_shared_partner_descriptions_match_content_on_home_and_about(self):
  for route,doc in docs.items():
   self.load(doc);kind=self.page.locator('#main').get_attribute('data-page')
   if kind not in ['home','about']:continue
   locale=self.page.locator('html').get_attribute('lang');partners=data(f'src/content/settings/{locale}.json')['partners']
   for design in LAYOUTS:
    self.page.evaluate('(d)=>document.documentElement.dataset.design=d',design)
    self.assertEqual(self.page.locator('.partner-grid h3').all_text_contents(),[p['name'] for p in partners])
    self.assertEqual(self.page.locator('.partner-grid p').all_text_contents(),[p['description'] for p in partners])
    self.assertEqual(self.page.locator('.partner-grid img,.partner-grid svg,.hero .partner-marks').count(),0)
 def test_all_five_layouts_keep_the_simplified_hero(self):
  for route in ['/','/en/','/ru/']:
   self.load(docs[route]);locale=self.page.locator('html').get_attribute('lang');h=data(f'src/content/pages/{locale}/home.json')
   for design in LAYOUTS:
    self.page.evaluate('(d)=>document.documentElement.dataset.design=d',design)
    self.assertEqual(' '.join(self.page.locator('h1').text_content().split()),' '.join(h['hero']['titleLines']))
    self.assertEqual(self.page.locator('.contact-block .btn').inner_text().strip(),h['contact']['label'])
    self.assertTrue(self.page.locator('.contact-block .btn').get_attribute('href').endswith({'it':'/contatti/','en':'/en/contacts/','ru':'/ru/kontakty/'}[locale]))
 def test_footer_columns_copyright_slogan_and_pending_socials(self):
  for route,doc in docs.items():
   self.load(doc)
   self.assertEqual(self.page.locator('.site-footer__tagline').inner_text(),'Italy meets Eurasia')
   self.assertEqual(self.page.locator('.site-footer__list a').count(),5)
   self.assertEqual(self.page.locator('.site-footer__reach .social-links li').count(),2)
   self.assertEqual(self.page.locator('.site-footer__bottom .social-links').count(),0)
   self.assertIn('© 2026 VIKUB.',self.page.locator('.site-footer__bottom').inner_text())
   # Do not turn missing owner-supplied URLs into fabricated public profiles.
   self.assertEqual(self.page.locator('.site-footer__socials a').count(),0)
 def test_contact_pages_show_city_country_and_four_requested_fields(self):
  for route in ['/contatti/','/en/contacts/','/ru/kontakty/']:
   self.load(docs[route]);locale=self.page.locator('html').get_attribute('lang');settings=data(f'src/content/settings/{locale}.json')
   self.assertEqual(self.page.locator('.office h2').all_text_contents(),[o['city']+' ('+o['note']+')' for o in settings['offices']])
   self.assertEqual(self.page.locator('.office address,.office__person').count(),0)
   for field in ['name','email','phone','message']:self.assertEqual(self.page.locator(f'.contact-form [name="{field}"]').count(),1)
   self.assertEqual(self.page.locator('.contact-form fieldset').get_attribute('disabled'),'')
   self.assertNotIn('Gozzi',self.page.locator('body').inner_text());self.assertNotIn('61032',self.page.locator('body').inner_text())
 def test_team_experts_and_status_match_latest_texts(self):
  for route in ['/azienda/','/en/about/','/ru/o-kompanii/']:
   self.load(docs[route]);locale=self.page.locator('html').get_attribute('lang');a=data(f'src/content/pages/{locale}/about.json')
   self.assertEqual(self.page.locator('.person').count(),2)
   self.assertEqual(self.page.locator('.person__about').all_text_contents(),[p['about'] for p in a['team']['people']])
   self.assertEqual(self.page.locator('.expert-network__text').inner_text(),a['experts']['text'])
   self.assertEqual(self.page.locator('.expert-network__people').count(),0)
   self.assertEqual(self.page.locator('.status .dash-list li').all_text_contents(),a['status']['items'])
 def test_event_time_and_eight_topics_unchanged_and_correct(self):
  for route in ['/eventi/','/en/events/','/ru/meropriyatiya/']:
   self.load(docs[route]);locale=self.page.locator('html').get_attribute('lang');e=data(f'src/content/pages/{locale}/events.json')
   body=self.page.locator('#main').inner_text()
   self.assertIn('10:00',body);self.assertNotIn('11:00',body)
   for topic in e['program']:self.assertIn(topic,body)
   self.assertEqual(len(e['program']),8)
 def test_svg_and_raster_icon_references_present_on_every_page(self):
  for route,doc in docs.items():
   self.load(doc)
   self.assertEqual(self.page.locator('link[rel="icon"][type="image/svg+xml"]').count(),1)
   self.assertEqual(self.page.locator('link[rel="apple-touch-icon"]').count(),1)
   self.assertEqual(self.page.locator('meta[property="og:image:width"]').get_attribute('content'),'1200')
   self.assertEqual(self.page.locator('meta[property="og:image:height"]').get_attribute('content'),'630')
if __name__=='__main__':unittest.main(argv=['brand_preview_checks'],verbosity=2)
