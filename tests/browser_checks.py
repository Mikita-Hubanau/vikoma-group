"""Isolated browser regression tests for the actual public JavaScript modules.

These fixtures are NOT an Astro build or an end-to-end delivery test.
They run on about:blank, without network navigation. Storage and the Google tag
transport are adapters, allowing the test suite to run in an offline browser.
Real cookie persistence, Google requests and live email delivery need E2E tests.
Optional: python -m pip install playwright; python -m playwright install chromium
Run: python tests/browser_checks.py
Set BROWSER_EXECUTABLE to use an already installed Chromium.
"""
from pathlib import Path
import html
import json
import os
import shutil
import unittest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
STYLE = (ROOT / 'src/styles/global.css').read_text()
FORM_COPY = json.loads((ROOT / 'src/content/pages/ru/contacts.json').read_text())['form']


def component_style(name):
    text = (ROOT / f'src/components/{name}.astro').read_text()
    return text.split('<style>', 1)[1].split('</style>', 1)[0] if '<style>' in text else ''


def document(body, css=''):
    return f'<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{STYLE}\n{css}</style></head><body>{body}</body></html>'


def form_fixture(configured=True, endpoint='https://forms.test/f/demo'):
    disabled = '' if configured else 'disabled'
    attrs = ' '.join(f'data-{key}="{html.escape(FORM_COPY[value])}"' for key, value in [
        ('submit','submit'),('sending','sending'),('success','success'),('error','error'),
        ('uncertain','uncertain'),('rate-limited','rateLimited'),('validation-error','validationError')])
    return document(f'''<div class="container"><div class="contact-form-block"><h2>{FORM_COPY['title']}</h2>
    <form data-contact-form data-configured="{str(configured).lower()}" {attrs} action="{endpoint}" method="POST">
    <input type="hidden" name="language" value="ru"><input type="hidden" name="_subject" value="VIKUB">
    <fieldset {disabled}><legend class="visually-hidden">Контакты</legend><div class="form-grid">
    <div class="form-field"><label for="name">Имя</label><input id="name" name="name" required maxlength="120"></div>
    <div class="form-field"><label for="email">Email</label><input id="email" name="email" type="email" required maxlength="254"></div>
    <div class="form-field form-field--full"><label for="phone">Телефон</label><input id="phone" name="phone" type="tel" maxlength="40"></div>
    <div class="form-field form-field--full"><label for="message">Сообщение</label><textarea id="message" name="message" required maxlength="5000"></textarea></div>
    </div><input name="_gotcha" tabindex="-1" style="position:absolute;left:-9999px"><div class="form-consent"><input id="consent" type="checkbox" name="consent" value="yes" required><label for="consent">{FORM_COPY['consent']}</label></div>
    <button data-submit-button type="submit" {disabled}>{FORM_COPY['submit']}</button></fieldset>
    <p data-form-status tabindex="-1" role="status" aria-live="polite"></p></form></div></div>''', component_style('ContactForm'))


def analytics_fixture():
    return document('''<button data-analytics-settings type="button">Настройки</button><aside class="analytics-banner" data-analytics-banner data-measurement-id="G-TEST1234" data-base-path="/" hidden><h2>Настройки аналитики</h2><p>Необязательная аналитика. Разрешить или отклонить.</p><div class="analytics-banner__actions"><button data-analytics-reject class="btn btn--ghost">Отклонить</button><button data-analytics-accept class="btn btn--ghost">Разрешить</button></div></aside>''', component_style('Analytics'))


class BrowserChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        executable = os.environ.get('BROWSER_EXECUTABLE') or shutil.which('chromium')
        cls.browser = cls.pw.chromium.launch(headless=True, executable_path=executable or None, args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()

    def setUp(self):
        self.context = self.browser.new_context()
        self.page = self.context.new_page()
        self.page.set_default_timeout(3000)
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [], 'Uncaught JavaScript error')

    def show(self, content, module, init=''):
        self.page.goto('about:blank')
        self.page.set_content(content)
        self.page.evaluate("""() => {
          window.testStorage = {};
          Object.defineProperty(window, 'localStorage', { configurable:true, get() {
            return { getItem(key) {return window.testStorage[key] ?? null},
                     setItem(key,value) {window.testStorage[key]=String(value)},
                     removeItem(key) {delete window.testStorage[key]} };
          }});
          window.tagRequests = [];
          const append = document.head.append.bind(document.head);
          document.head.append = (...nodes) => {
            for (const node of nodes) {
              if (node instanceof HTMLScriptElement && node.hasAttribute('data-vikub-analytics')) {
                window.tagRequests.push(node.src);
                node.type = 'text/plain'; // Deliberately prevent an external request.
              }
            }
            append(...nodes);
          };
        }""")
        if init:
            self.page.evaluate(init)
        self.current_content = content
        self.inject(module)

    def inject(self, module):
        source = (ROOT / f'public/scripts/{module}.js').read_text()
        self.page.add_script_tag(type='module', content=source)
        self.page.wait_for_timeout(40)

    def fill_form(self):
        self.page.fill('[name=name]', 'Мария')
        self.page.fill('[name=email]', 'test@example.com')
        self.page.fill('[name=message]', 'Тестовое сообщение')
        self.page.check('[name=consent]')

    def submit(self):
        self.page.click('[data-submit-button]')
        self.page.wait_for_function("document.querySelector('[data-form-status]').textContent.length > 0")

    def status_is(self, key, keep=True):
        self.assertEqual(self.page.locator('[data-form-status]').inner_text(), FORM_COPY[key])
        self.assertFalse(self.page.locator('[data-submit-button]').is_disabled())
        self.assertEqual(self.page.locator('[name=name]').input_value(), 'Мария' if keep else '')

    def test_form_unconfigured_has_no_request(self):
        self.show(form_fixture(False), 'contact-form')
        self.page.evaluate("(()=>{window.calls=0;window.fetch=()=>{calls++;return Promise.reject()}})()")
        self.page.locator('form').dispatch_event('submit')
        self.assertTrue(self.page.locator('[data-submit-button]').is_disabled())
        self.assertEqual(self.page.evaluate('calls'), 0)

    def test_form_browser_validation(self):
        self.show(form_fixture(), 'contact-form')
        self.page.evaluate("(()=>{window.calls=0;window.fetch=()=>{calls++;return Promise.reject()}})()")
        self.page.click('[data-submit-button]')
        self.assertEqual(self.page.evaluate('calls'), 0)
        self.assertEqual(self.page.locator('[data-form-status]').inner_text(), '')

    def test_form_success_payload_and_reset(self):
        self.show(form_fixture(), 'contact-form')
        self.page.evaluate("""(()=>{window.fetch=async(url,options)=>{ window.sent={url,method:options.method,credentials:options.credentials,data:Object.fromEntries(options.body.entries())};return new Response('{"ok":true}',{status:200,headers:{'Content-Type':'application/json'}})}})()""")
        self.fill_form(); self.submit(); self.status_is('success', False)
        sent = self.page.evaluate('sent')
        self.assertEqual(sent['data']['email'], 'test@example.com')
        self.assertEqual(sent['data']['consent'], 'yes')
        self.assertEqual(sent['data']['phone'], '')
        self.assertEqual(sent['method'], 'POST')
        self.assertEqual(sent['credentials'], 'omit')
        self.assertTrue(self.page.locator('[data-form-status]').evaluate('element=>element===document.activeElement'))

    def test_form_alternate_success_contract(self):
        self.show(form_fixture(), 'contact-form')
        self.page.evaluate("""(()=>{window.fetch=async()=>new Response('{"success":true}',{headers:{'Content-Type':'application/json'}})})()""")
        self.fill_form(); self.submit(); self.status_is('success', False)

    def test_form_error_statuses(self):
        self.show(form_fixture(), 'contact-form'); self.fill_form()
        for code, key in [(400,'validationError'),(422,'validationError'),(429,'rateLimited'),(500,'error')]:
            with self.subTest(code=code):
                self.page.evaluate('(code)=>{window.fetch=async()=>new Response("{}",{status:code})}', code)
                self.submit(); self.status_is(key)

    def test_form_does_not_accept_fake_200(self):
        self.show(form_fixture(), 'contact-form'); self.fill_form()
        for body, mime in [('<h1>Success</h1>','text/html'),('{}','application/json'),('{broken','application/json'),('{"ok":false}','application/json')]:
            with self.subTest(body=body):
                self.page.evaluate('([body,mime])=>{window.fetch=async()=>new Response(body,{headers:{"Content-Type":mime}})}',[body,mime])
                self.submit(); self.status_is('uncertain')

    def test_form_network_error_keeps_input(self):
        self.show(form_fixture(), 'contact-form')
        self.page.evaluate('(()=>{window.fetch=async()=>{throw new TypeError("Network failure")}})()')
        self.fill_form(); self.submit(); self.status_is('uncertain')

    def test_form_timeout_keeps_input(self):
        self.show(form_fixture(), 'contact-form')
        self.page.evaluate('''(()=>{const originalTimeout=window.setTimeout;window.setTimeout=(fn,ms)=>originalTimeout(fn,ms===15000?30:ms);window.fetch=(_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))));})()''')
        self.fill_form(); self.submit(); self.status_is('uncertain')

    def test_form_duplicate_submission_is_blocked(self):
        self.show(form_fixture(), 'contact-form')
        self.page.evaluate('(()=>{window.calls=0;window.fetch=()=>{calls++;return new Promise(resolve=>{window.resolveFetch=resolve})}})()')
        self.fill_form(); self.page.click('[data-submit-button]')
        self.page.locator('form').dispatch_event('submit')
        self.assertTrue(self.page.locator('[data-submit-button]').is_disabled())
        self.assertEqual(self.page.evaluate('calls'), 1)
        self.page.evaluate('resolveFetch(new Response(\'{"ok":true}\',{headers:{"Content-Type":"application/json"}}))')
        self.page.wait_for_function("!document.querySelector('[data-submit-button]').disabled")
        self.status_is('success',False)

    def test_form_honeypot_blocks_request(self):
        self.show(form_fixture(), 'contact-form')
        self.page.evaluate('(()=>{window.calls=0;window.fetch=()=>{calls++;return Promise.reject()}})()')
        self.fill_form()
        self.page.locator('[name=_gotcha]').evaluate("el=>el.value='spam'")
        self.submit(); self.status_is('error')
        self.assertEqual(self.page.evaluate('calls'),0)

    def test_form_unsafe_endpoint_blocks_request(self):
        self.show(form_fixture(endpoint='http://forms.test/f/demo'), 'contact-form')
        self.page.evaluate('(()=>{window.calls=0;window.fetch=()=>{calls++;return Promise.reject()}})()')
        self.fill_form(); self.submit(); self.status_is('error')
        self.assertEqual(self.page.evaluate('calls'),0)

    def analytics(self, init=''):
        self.show(analytics_fixture(),'analytics',init)

    @property
    def requests(self):
        return self.page.evaluate('window.tagRequests')

    def test_analytics_no_request_before_consent(self):
        self.analytics()
        self.assertTrue(self.page.locator('[data-analytics-banner]').is_visible())
        self.assertEqual(self.requests,[])
        self.assertTrue(self.page.evaluate('window["ga-disable-G-TEST1234"]'))

    def test_analytics_decline_is_remembered(self):
        self.analytics(); self.page.click('[data-analytics-reject]')
        self.assertFalse(self.page.locator('[data-analytics-banner]').is_visible())
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('vikub-analytics-v1:/')).choice"),'denied')
        saved=self.page.evaluate('window.testStorage'); self.analytics(f'Object.assign(window.testStorage,{json.dumps(saved)})')
        self.assertFalse(self.page.locator('[data-analytics-banner]').is_visible())
        self.assertEqual(self.requests,[])

    def test_analytics_grant_loads_once_and_sanitizes_url(self):
        self.analytics(); self.page.click('[data-analytics-accept]')
        self.page.wait_for_function("document.querySelector('[data-vikub-analytics]') !== null")
        self.page.click('[data-analytics-settings]'); self.page.click('[data-analytics-accept]')
        self.assertEqual(len(self.requests),1)
        config = self.page.evaluate("Array.from(dataLayer.find(entry=>entry[0]==='config'))")
        self.assertEqual(config[2]['page_location'],self.page.evaluate('location.origin+location.pathname'))
        self.assertFalse(config[2]['allow_google_signals'])
        self.assertFalse(config[2]['allow_ad_personalization_signals'])

    def test_analytics_withdrawal_disables_after_reload(self):
        self.analytics(); self.page.click('[data-analytics-accept]')
        self.assertEqual(len(self.requests),1)
        self.page.click('[data-analytics-settings]')
        # Capture storage immediately before the source script reloads the page.
        self.page.evaluate("document.querySelector('[data-analytics-reject]').addEventListener('click',()=>{queueMicrotask(()=>window.name=JSON.stringify(window.testStorage))})")
        with self.page.expect_navigation(wait_until='load'):
            self.page.click('[data-analytics-reject]')
        saved = self.page.evaluate('window.name')
        self.analytics(f'Object.assign(window.testStorage,{saved})')
        self.assertEqual(len(self.requests),0)
        self.assertFalse(self.page.locator('[data-analytics-banner]').is_visible())
        self.assertTrue(self.page.evaluate('window["ga-disable-G-TEST1234"]'))
        self.assertEqual(self.page.locator('[data-vikub-analytics]').count(),0)

    def test_analytics_expired_choice_requires_consent(self):
        self.analytics("localStorage.setItem('vikub-analytics-v1:/',JSON.stringify({version:1,choice:'granted',at:Date.now()-181*86400000}))")
        self.assertTrue(self.page.locator('[data-analytics-banner]').is_visible())
        self.assertEqual(self.requests,[])

    def test_analytics_corrupt_storage_requires_consent(self):
        self.analytics("localStorage.setItem('vikub-analytics-v1:/','broken')")
        self.assertTrue(self.page.locator('[data-analytics-banner]').is_visible())
        self.assertEqual(self.requests,[])

    def test_analytics_blocked_storage_does_not_break_page(self):
        self.analytics("Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage blocked')}})")
        self.page.click('[data-analytics-reject]')
        self.assertFalse(self.page.locator('[data-analytics-banner]').is_visible())
        self.page.click('[data-analytics-settings]'); self.page.click('[data-analytics-accept]')
        self.assertEqual(len(self.requests),1)

    def test_analytics_keyboard_and_return_focus(self):
        self.analytics(); self.page.click('[data-analytics-reject]')
        self.page.click('[data-analytics-settings]'); self.page.keyboard.press('Escape')
        self.assertFalse(self.page.locator('[data-analytics-banner]').is_visible())
        self.assertTrue(self.page.locator('[data-analytics-settings]').evaluate('el=>el===document.activeElement'))

    def test_analytics_cross_tab_grant(self):
        self.analytics()
        self.page.evaluate("localStorage.setItem('vikub-analytics-v1:/',JSON.stringify({version:1,choice:'granted',at:Date.now()}));dispatchEvent(new StorageEvent('storage',{key:'vikub-analytics-v1:/'}))")
        self.page.wait_for_timeout(30)
        self.assertEqual(len(self.requests),1)
        self.assertFalse(self.page.locator('[data-analytics-banner]').is_visible())

    def test_event_open_closed_ended_and_clock_change(self):
        body = '<section data-event-status data-deadline="2026-09-28T23:59:59+02:00" data-end="2026-10-01T11:00:00Z"><div data-event-open><a data-registration-link href="https://forms.gle/test">Регистрация</a></div><p data-event-archive hidden>Архив</p><p data-event-closed hidden>Закрыто</p><p data-event-ended hidden>Завершено</p></section>'
        self.show(document(body),'event-state',"window.testNow=Date.parse('2026-09-05T10:00:00Z');Date.now=()=>window.testNow")
        self.assertTrue(self.page.locator('[data-event-open]').is_visible())
        self.assertFalse(self.page.locator('[data-event-closed]').is_visible())
        for date, expected in [('2026-09-28T21:59:59Z','open'),('2026-09-28T22:00:00Z','closed'),('2026-10-01T11:00:00Z','ended')]:
            with self.subTest(date=date):
                self.page.evaluate('(date)=>{window.testNow=Date.parse(date);dispatchEvent(new Event("pageshow"))}',date)
                for state in ['open','closed','ended']:
                    self.assertEqual(self.page.locator(f'[data-event-{state}]').is_visible(),state==expected)
        self.assertEqual(self.page.locator('[data-registration-link]').get_attribute('aria-disabled'),'true')

    def test_event_late_click_blocked_between_updates(self):
        body='<section data-event-status data-deadline="2026-09-28T23:59:59+02:00" data-end="2026-10-01T11:00:00Z"><div data-event-open><a data-registration-link href="https://forms.gle/test">Регистрация</a></div><p data-event-closed hidden>Закрыто</p></section>'
        self.show(document(body),'event-state',"window.testNow=Date.parse('2026-09-05T10:00:00Z');Date.now=()=>window.testNow")
        prevented=self.page.evaluate("""()=>{window.testNow=Date.parse('2026-09-29T00:00:00Z');let click=new MouseEvent('click',{bubbles:true,cancelable:true});document.querySelector('[data-registration-link]').dispatchEvent(click);return click.defaultPrevented}""")
        self.assertTrue(prevented)
        self.assertTrue(self.page.locator('[data-event-closed]').is_visible())

    def test_form_and_analytics_fixture_responsive_widths(self):
        for module, markup in [('contact-form',form_fixture()),('analytics',analytics_fixture())]:
            self.show(markup,module)
            for width in [320,375,768,1440]:
                with self.subTest(module=module,width=width):
                    self.page.set_viewport_size({'width':width,'height':900})
                    self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Horizontal overflow')


if __name__ == '__main__':
    unittest.main(verbosity=2)
