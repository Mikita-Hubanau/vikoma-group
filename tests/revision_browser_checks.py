"""Offline isolated tests of the actual design and registration JavaScript.
Not an Astro build; storage and HTTP responses are controlled test adapters.
Run: python tests/revision_browser_checks.py (requires Playwright + Chromium).
"""
from pathlib import Path
import html, json, os, re, shutil, unittest
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
LABELS=json.loads((R/'src/content/pages/ru/events.json').read_text())['registration']
DESIGNS=['signature','balance','editorial','atlas','panorama']

class RevisionBrowserChecks(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pw=sync_playwright().start();cls.browser=cls.pw.chromium.launch(headless=True,executable_path=os.environ.get('BROWSER_EXECUTABLE') or shutil.which('chromium'),args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.pw.stop()
 def setUp(self):
  self.ctx=self.browser.new_context();self.page=self.ctx.new_page();self.page.set_default_timeout(3000);self.errors=[];self.page.on('pageerror',lambda e:self.errors.append(str(e)))
  self.page.goto('about:blank')
  self.page.evaluate("""()=>{window.store={};window.calls=[];Object.defineProperty(window,'localStorage',{configurable:true,get:()=>({getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v)})});}""")
 def tearDown(self):self.ctx.close();self.assertEqual(self.errors,[])
 def script(self,name):
  self.page.add_script_tag(type='module',content=(R/f'public/scripts/{name}.js').read_text());self.page.wait_for_timeout(30)
 def designs(self):
  buttons=''.join(f'<button type="button" data-design-choice="{v}" data-design-name="{v}" aria-pressed="{str(i==0).lower()}">{i+1}</button>' for i,v in enumerate(DESIGNS))
  self.page.set_content(f'<html data-design="signature"><body><div data-design-switcher><div role="group">{buttons}</div><span data-design-current></span></div></body></html>')
  self.script('design-switcher')
 def test_all_five_buttons_switch_and_update_aria(self):
  self.designs()
  for design in DESIGNS:
   self.page.click(f'[data-design-choice={design}]');self.assertEqual(self.page.locator('html').get_attribute('data-design'),design);self.assertEqual(self.page.locator('[aria-pressed=true]').count(),1);self.assertEqual(self.page.locator('[data-design-current]').inner_text(),design);self.assertEqual(self.page.evaluate("store['vikub-design']"),design)
 def test_design_can_be_selected_with_keyboard(self):
  self.designs();self.page.focus('[data-design-choice=balance]');self.page.keyboard.press('Enter');self.assertEqual(self.page.locator('html').get_attribute('data-design'),'balance')
 def test_storage_blocked_does_not_break_design_buttons(self):
  self.page.evaluate("Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new Error('blocked')}})");self.designs();self.page.click('[data-design-choice=atlas]');self.assertEqual(self.page.locator('html').get_attribute('data-design'),'atlas')
 def test_cross_tab_design_selection(self):
  self.designs();self.page.evaluate("window.dispatchEvent(new StorageEvent('storage',{key:'vikub-design',newValue:'editorial'}))");self.assertEqual(self.page.locator('html').get_attribute('data-design'),'editorial')
 def test_invalid_cross_tab_value_ignored(self):
  self.designs();self.page.evaluate("window.dispatchEvent(new StorageEvent('storage',{key:'vikub-design',newValue:'not-a-design'}))");self.assertEqual(self.page.locator('html').get_attribute('data-design'),'signature')
 def test_head_bootstrap_restores_known_saved_design(self):
  head=re.search(r'<script is:inline>([\s\S]*?)</script>',(R/'src/layouts/BaseLayout.astro').read_text())[1]
  self.page.set_content('<html data-design="signature"><body></body></html>');self.page.evaluate("store['vikub-design']='panorama'");self.page.add_script_tag(content=head);self.assertEqual(self.page.locator('html').get_attribute('data-design'),'panorama')
 def test_head_bootstrap_rejects_invalid_saved_design(self):
  head=re.search(r'<script is:inline>([\s\S]*?)</script>',(R/'src/layouts/BaseLayout.astro').read_text())[1]
  self.page.set_content('<html data-design="signature"><body></body></html>');self.page.evaluate("store['vikub-design']='unknown'");self.page.add_script_tag(content=head);self.assertEqual(self.page.locator('html').get_attribute('data-design'),'signature')
 def registration(self,configured=True,deadline='2026-09-28T23:59:59+02:00'):
  attrs=' '.join(f'data-{k}="{html.escape(LABELS[v])}"' for k,v in [('submit','button'),('sending','sending'),('success','success'),('error','error'),('uncertain','uncertain'),('rate-limited','rateLimited'),('validation-error','validationError'),('closed','closed')])
  disabled='' if configured else 'disabled'
  self.page.set_content(f'''<form data-registration-form data-configured="{str(configured).lower()}" data-deadline="{deadline}" action="https://form.test/register" method="POST" {attrs}>
  <input type="hidden" name="form_type" value="seminar_registration"><input type="hidden" name="event_start" value="2026-10-01T10:00:00+02:00"><input type="hidden" name="language" value="ru">
  <fieldset {disabled}><label>Имя<input name="first_name" type="text" required></label><label>Фамилия<input name="last_name" type="text" required></label><label>Компания<input name="company" type="text" required></label><label>Email<input name="email" type="email" required></label><label>Телефон<input name="phone" type="tel"></label><input name="_gotcha" type="hidden"><label><input type="checkbox" name="consent" value="yes" required>Согласие</label><button type="submit" data-submit-button {disabled}>{LABELS['button']}</button></fieldset><p data-form-status tabindex="-1" role="status"></p></form>''')
  # Deterministic time: independent of the day on which tests are rerun.
  self.page.evaluate("Date.now=()=>Date.parse('2026-09-10T08:00:00Z')")
  self.script('contact-form')
 def fill(self):
  for name,value in [('first_name','Mario'),('last_name','Rossi'),('company','Example Srl'),('email','mario@example.test')]:self.page.fill(f'[name={name}]',value)
  self.page.check('[name=consent]')
 def respond(self,status=200,data=None):
  self.page.evaluate('''([status,data])=>{window.fetch=async(url,options)=>{calls.push({url,body:Object.fromEntries(options.body.entries())});return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}})}}''',[status,{'ok':True} if data is None else data])
 def submit(self):self.page.click('[data-submit-button]');self.page.wait_for_timeout(50)
 def test_success_payload_confirmation_and_duplicate_guard(self):
  self.registration();self.fill();self.respond();self.submit();self.assertEqual(self.page.locator('[data-form-status]').inner_text(),LABELS['success']);self.assertTrue(self.page.locator('fieldset').is_hidden());self.assertTrue(self.page.locator('[data-submit-button]').is_disabled());data=self.page.evaluate('calls[0].body');self.assertEqual(data['first_name'],'Mario');self.assertEqual(data['last_name'],'Rossi');self.assertEqual(data['company'],'Example Srl');self.assertEqual(data['phone'],'');self.assertEqual(data['form_type'],'seminar_registration');self.page.evaluate("document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true}))");self.assertEqual(self.page.evaluate('calls.length'),1)
 def test_company_required_and_phone_optional(self):
  self.registration();self.fill();self.respond();self.page.fill('[name=company]','');self.submit();self.assertEqual(self.page.evaluate('calls.length'),0);self.page.fill('[name=company]','Company');self.submit();self.assertEqual(self.page.evaluate('calls.length'),1)
 def test_registration_closed_guard(self):
  self.registration(deadline='2026-09-09T23:59:59+02:00');self.fill();self.respond();self.submit();self.assertEqual(self.page.evaluate('calls.length'),0);self.assertEqual(self.page.locator('[data-form-status]').inner_text(),LABELS['closed'])
 def test_registration_unconfigured_does_not_send(self):
  self.registration(configured=False);self.respond();self.page.evaluate("document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true}))");self.assertEqual(self.page.evaluate('calls.length'),0);self.assertTrue(self.page.locator('fieldset').evaluate('(element) => element.disabled'))
 def test_422_keeps_data_and_shows_validation_message(self):
  self.registration();self.fill();self.respond(422,{'errors':['email']});self.submit();self.assertEqual(self.page.locator('[data-form-status]').inner_text(),LABELS['validationError']);self.assertEqual(self.page.input_value('[name=first_name]'),'Mario');self.assertFalse(self.page.locator('fieldset').is_disabled())
 def test_fake_200_is_not_success(self):
  self.registration();self.fill();self.respond(200,{'message':'not accepted'});self.submit();self.assertEqual(self.page.locator('[data-form-status]').inner_text(),LABELS['uncertain']);self.assertFalse(self.page.locator('fieldset').is_hidden())
 def test_network_error_keeps_registration_fields(self):
  self.registration();self.fill();self.page.evaluate("() => { window.fetch=async()=>{throw new Error('offline')} }");self.submit();self.assertEqual(self.page.locator('[data-form-status]').inner_text(),LABELS['uncertain']);self.assertEqual(self.page.input_value('[name=company]'),'Example Srl')

if __name__=='__main__':unittest.main(verbosity=2)
