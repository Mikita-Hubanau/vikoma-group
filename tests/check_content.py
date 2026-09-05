"""Offline CMS/content coverage check. Requires Python and PyYAML.
Run from any directory: python tests/check_content.py
This validates content-to-CMS coverage, not Astro/Zod type inference.
"""
from pathlib import Path
import json, re, yaml
root=Path(__file__).resolve().parents[1]
config=yaml.safe_load((root/'public/admin/config.yml').read_text())
errors=[]; checked=0

def fields_check(data, fields, where):
 global checked
 if not isinstance(data,dict): errors.append(f'{where}: not an object');return
 names={f['name'] for f in fields}
 for key in data:
  if key not in names: errors.append(f'{where}.{key}: no CMS field')
 for field in fields:
  name=field['name']; key=f'{where}.{name}'; checked+=1
  if name not in data:
   if field.get('required',True) and 'default' not in field:errors.append(f'{key}: missing required CMS field')
   continue
  value=data[name]
  if value == '' and field.get('required',True): errors.append(f'{key}: CMS forbids empty supplied value')
  if field['widget']=='object': fields_check(value,field['fields'],key)
  elif field['widget']=='list':
   if not isinstance(value,list):errors.append(f'{key}: expected a list');continue
   if 'fields' in field:
    for i,item in enumerate(value):fields_check(item,field['fields'],f'{key}[{i}]')
  elif field['widget']=='select':
   values=[o.get('value') if isinstance(o,dict) else o for o in field['options']]
   if value not in values:errors.append(f'{key}: unknown option {value}')

for c in config['collections']:
 locales=config['i18n']['locales'] if c.get('i18n') else [None]
 for file in c.get('files',[]):
  for locale in locales:
   path=root/file['file'].replace('{{locale}}',str(locale))
   if not path.exists():errors.append(f'{path}: missing');continue
   fields_check(json.loads(path.read_text()),file['fields'],str(path.relative_to(root)))
 if c.get('folder'):
  for locale in locales:
   for path in (root/c['folder']/str(locale)).glob('*.md'):
    _,frontmatter,body=path.read_text().split('---',2)
    fields_check(dict(yaml.safe_load(frontmatter),body=body),c['fields'],str(path.relative_to(root)))
for path in root.rglob('*'):
 if path.suffix not in ['.ts','.mjs','.astro']:continue
 text=path.read_text()
 for match in re.finditer(r'''(?:from\s+|import\s*)['"](\.[^'"]+)['"]''',text):
  target=(path.parent/match[1]).resolve()
  if not any(p.exists() for p in [target,Path(str(target)+'.ts'),Path(str(target)+'.mjs'),target/'index.ts']):errors.append(f'{path}: unresolved local import {match[1]}')
print('CMS fields checked:', checked)
if errors:
 print('\n'.join(errors));raise SystemExit(1)
print('CMS JSON/frontmatter field coverage and local imports: OK')
