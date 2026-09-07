"""Offline PHP integration checks. Never sends email or touches production storage.
Runs a temporary copy of the actual endpoint with only its storage path, deadline
and mail transport replaced. PHP validation, email composition and logging stay real.
Run: python tests/php_form_checks.py (requires PHP CLI).
"""
from pathlib import Path
import base64,json,os,re,subprocess,tempfile,unittest
R=Path(__file__).resolve().parents[1]
class PHPFormChecks(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory(prefix='vikub-php-test-');self.root=Path(self.tmp.name)
  self.storage=self.root/'storage'
  source=(R/'public/api/contact.php').read_text()
  source=re.sub(r"const STORAGE_DIR\s*=\s*'[^']+';",f"const STORAGE_DIR = '{self.storage}';",source)
  source=re.sub(r"const REG_DEADLINE\s*=\s*'[^']+';","const REG_DEADLINE = '2099-09-28T23:59:59+02:00';",source)
  old="$sent = send_mail($subject, build_body($formType, $language, $values), $sender, $values['email']);"
  self.assertIn(old,source)
  source=source.replace(old,"file_put_contents(STORAGE_DIR . '/captured-mail.json', json_encode(['subject'=>$subject,'body'=>build_body($formType,$language,$values),'reply'=>$values['email']], JSON_UNESCAPED_UNICODE));\n$sent = true;")
  self.endpoint=self.root/'contact.php';self.endpoint.write_text(source)
 def tearDown(self):self.tmp.cleanup()
 def valid(self,lang='ru'):
  topic=json.loads((R/f'src/content/pages/{lang}/contacts.json').read_text())['form']['services'][6]
  return dict(form_type='contact_enquiry',language=lang,name='Mario Rossi',email='mario@example.test',phone='+39 328 2303160',company='  Example Srl  ',service=topic,message='Business request',consent='yes')
 def run_endpoint(self,data):
  encoded=base64.b64encode(json.dumps(data,ensure_ascii=False).encode()).decode()
  code="$_POST=json_decode(base64_decode(getenv('PAYLOAD')),true);$_SERVER=['REQUEST_METHOD'=>'POST','HTTP_ACCEPT'=>'application/json','REMOTE_ADDR'=>'127.0.0.1'];register_shutdown_function(function(){fwrite(STDERR,'HTTP_STATUS:'.http_response_code());});require getenv('ENDPOINT');"
  proc=subprocess.run(['php','-r',code],capture_output=True,text=True,env={**os.environ,'PAYLOAD':encoded,'ENDPOINT':str(self.endpoint)})
  self.assertEqual(proc.returncode,0,proc.stderr)
  status=int(re.search(r'HTTP_STATUS:(\d+)',proc.stderr)[1]);return status,json.loads(proc.stdout)
 def test_all_locales_store_company_topic_and_compose_email(self):
  for lang in ['it','en','ru']:
   with self.subTest(lang=lang):
    data=self.valid(lang);status,result=self.run_endpoint(data)
    self.assertEqual(status,200);self.assertTrue(result['ok'])
    mail=json.loads((self.storage/'captured-mail.json').read_text())
    self.assertIn('Example Srl',mail['body']);self.assertIn(data['service'],mail['body'])
    logs='\n'.join(p.read_text() for p in self.storage.glob('*.jsonl'))
    self.assertIn('Example Srl',logs);self.assertIn(data['service'],logs)
 def test_all_new_contact_fields_are_mandatory(self):
  for name in ['name','email','phone','company','service','message','consent']:
   with self.subTest(field=name):
    data=self.valid();data[name]='   ';status,result=self.run_endpoint(data)
    self.assertEqual(status,422);self.assertFalse(result['ok'])
 def test_invalid_phones_rejected(self):
  for phone in ['abcdefghi','123456','1234567890123456','39+3282303160']:
   data=self.valid();data['phone']=phone;self.assertEqual(self.run_endpoint(data)[0],422)
 def test_topic_must_match_the_localized_dropdown(self):
  data=self.valid();data['service']='unsupported';self.assertEqual(self.run_endpoint(data)[0],422)
 def test_all_24_dropdown_options_are_accepted(self):
  # Separate IPs avoid deliberately exercising the unrelated rate limiter.
  for lang in ['it','en','ru']:
   topics=json.loads((R/f'src/content/pages/{lang}/contacts.json').read_text())['form']['services']
   for topic in topics:
    for p in (self.storage/'ratelimit').glob('*.json'):p.unlink()
    data=self.valid(lang);data['service']=topic;self.assertEqual(self.run_endpoint(data)[0],200,topic)
 def test_array_fields_and_bad_email_rejected(self):
  for key,value in [('company',['x']),('email','invalid-address')]:
   data=self.valid();data[key]=value;self.assertEqual(self.run_endpoint(data)[0],422)
 def test_header_injection_rejected(self):
  data=self.valid();data['name']='Mario\r\nBcc: attacker@example.test';self.assertEqual(self.run_endpoint(data)[0],422)
 def test_registration_keeps_optional_phone(self):
  data=dict(form_type='seminar_registration',language='ru',first_name='Mario',last_name='Rossi',company='Example',email='mario@example.test',phone='',consent='yes',event_id='vikub-seminar-2026-10-01')
  self.assertEqual(self.run_endpoint(data)[0],200)
if __name__=='__main__':unittest.main(verbosity=2)
