"""Browser tests of source-based previews, NOT a compiled Astro build.
Run: python tests/events_preview_checks.py [preview/VIKUB-layout-preview.html]
Requires Playwright + Chromium. Never submits a form.
"""
from pathlib import Path
import json, os, re, shutil, sys, unittest
from playwright.sync_api import sync_playwright
R = Path(__file__).resolve().parents[1]
PREVIEW = Path(sys.argv[1]) if len(sys.argv) > 1 else R / 'preview/VIKUB-layout-preview.html'
DOCS = json.loads(PREVIEW.read_text().split('const docs=', 1)[1].split(';\nconst frame=', 1)[0])
COPY = json.loads((R / 'tests/fixtures/events-copy.json').read_text())
ROUTES = {'ru': '/ru/meropriyatiya/', 'it': '/eventi/'}

class EventsPreviewChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(executable_path=os.environ.get('BROWSER_EXECUTABLE') or shutil.which('chromium'), args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()

    def setUp(self):
        self.page = self.browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
        self.page.route('**/*', lambda route: route.abort())

    def tearDown(self):
        self.page.close()

    def show(self, locale):
        self.page.set_content(re.sub(r'<script\b[^>]*>[\s\S]*?</script>', '', DOCS[ROUTES[locale]]))

    def test_full_approved_copy_in_both_languages(self):
        for locale, copy in COPY.items():
            self.show(locale)
            b = copy['benefits']
            self.assertEqual(self.page.locator('.event-benefits h2').inner_text(), b['title'])
            self.assertEqual(self.page.locator('.feature-section__subtitle').inner_text(), b['subtitle'])
            self.assertEqual(self.page.locator('.event-benefits .feature h3').all_text_contents(), [x['title'] for x in b['items']])
            self.assertEqual(self.page.locator('.event-benefits .feature p').all_text_contents(), [x['text'] for x in b['items']])
            self.assertEqual(self.page.locator('.event-benefits svg').count(), 4)
            a = copy['agenda']
            self.assertEqual(self.page.locator('.event-program > h2').inner_text(), copy['programTitle'])
            self.assertEqual(self.page.locator('.program-format').inner_text(), a['format'])
            self.assertEqual(self.page.locator('.program-list > li > h3').all_text_contents(), [x['title'] for x in a['items']])
            for i, item in enumerate(a['items']):
                li = self.page.locator('.program-list > li').nth(i)
                self.assertEqual(li.locator('.program-speaker').all_text_contents(), [item['speaker']] if item['speaker'] else [])
                self.assertEqual(li.locator('.program-description').all_text_contents(), item['paragraphs'])
            self.assertEqual(self.page.locator('.program-optional h3').inner_text(), a['optionalTitle'])
            self.assertEqual(self.page.locator('.program-optional li').all_text_contents(), a['optionalItems'])
            self.assertEqual(self.page.locator('.program-note').inner_text(), copy['programNote'])

    def test_native_numbering_six_items_optional_outside_main_time(self):
        for locale in ROUTES:
            self.show(locale)
            self.assertEqual(self.page.locator('ol.program-list > li').count(), 6)
            self.assertEqual(self.page.locator('ol.program-list').evaluate('e => getComputedStyle(e).listStyleType'), 'decimal')
            self.assertEqual(self.page.locator('ol.program-list .program-optional-item').count(), 0)
            self.assertEqual(self.page.locator('.program-optional-item').count(), 2)
            self.assertEqual(self.page.locator('.program-optional').get_attribute('aria-labelledby'), 'program-optional-title')
            self.assertEqual(self.page.locator('#program-optional-title').count(), 1)
            self.assertTrue(self.page.evaluate("document.querySelector('.program-list').nextElementSibling.matches('.program-optional')"))
            self.assertEqual(self.page.locator('.program-group,.program-bookend').count(), 0)

    def test_long_copy_is_not_clipped_at_five_viewport_widths(self):
        for locale in ROUTES:
            for width in [320, 375, 768, 1024, 1440]:
                self.page.set_viewport_size({'width': width, 'height': 1000})
                self.show(locale)
                self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (locale, width))
                clipped = self.page.locator('.feature h3,.feature p,.program-item h3,.program-speaker,.program-description,.program-optional h3,.program-optional li').evaluate_all('els => els.filter(e => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1).map(e => e.textContent)')
                self.assertEqual(clipped, [], (locale, width))

    def test_text_at_200_percent_remains_readable_without_overflow(self):
        for locale in ROUTES:
            self.page.set_viewport_size({'width': 768, 'height': 1000})
            self.show(locale)
            self.page.add_style_tag(content='html { font-size: 200% !important; }')
            self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), locale)
            self.assertEqual(self.page.locator('.program-item').count(), 6)

    def test_registration_still_present_without_changed_required_fields(self):
        for locale in ROUTES:
            self.show(locale)
            self.assertEqual(self.page.locator('#registration').count(), 1)
            self.assertEqual(self.page.locator('#registration [required]').evaluate_all('els => els.map(e => e.name)'), ['first_name', 'last_name', 'company', 'email', 'consent'])
            self.assertEqual(self.page.locator('a[href="#registration"]').count(), 1)
            self.assertEqual(self.page.locator('.event-free').count(), 2)

if __name__ == '__main__':
    unittest.main(argv=['events_preview_checks'], verbosity=2)
