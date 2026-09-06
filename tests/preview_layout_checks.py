from playwright.sync_api import sync_playwright
from pathlib import Path
import re,json,time
import argparse,os,shutil
parser=argparse.ArgumentParser(description='Check the standalone visual snapshot; this is NOT an Astro build test.')
parser.add_argument('preview',type=Path,help='Path to VIKUB-layout-preview.html')
parser.add_argument('--report',type=Path,default=Path('preview-layout-results.json'))
args=parser.parse_args()
source=args.preview.read_text()
docs=json.loads(source.split('const docs=',1)[1].split(';\nconst frame=',1)[0])
out=[];errors=[];count=0
# Source-derived visual previews, not compiled Astro output. No network dependencies.
def clean(s):
 return re.sub(r'<script\b[^>]*>[\s\S]*?</script>', '', s)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('BROWSER_EXECUTABLE') or shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
 for route,source in docs.items():
  page.set_content(clean(source))
  for design in ['signature','balance','editorial','atlas','panorama']:
   page.evaluate('(design)=>document.documentElement.dataset.design=design',design)
   for width in [320,361,375,768,1024,1440]:
    page.set_viewport_size({'width':width,'height':1000})
    found=page.evaluate('''()=>{const bad=[];for(const e of document.querySelectorAll('body *')){if(e.closest('svg')||e.matches('style,script,.visually-hidden,.skip-link')||e.closest('.visually-hidden'))continue;const r=e.getBoundingClientRect();const s=getComputedStyle(e);if(r.width<1||r.height<1||s.visibility==='hidden'||s.display==='none')continue;if(r.right>innerWidth+2||r.left< -2)bad.push({tag:e.tagName,cls:e.className,left:Math.round(r.left),right:Math.round(r.right),text:(e.innerText||'').slice(0,65)});}return {overflow:bad.slice(0,12),h1:document.querySelectorAll('h1').length,duplicateIds:[...document.querySelectorAll('[id]')].map(x=>x.id).filter((x,i,a)=>a.indexOf(x)!==i),langBottom:document.querySelector('.site-header__lang').getBoundingClientRect().bottom,designTop:document.querySelector('[data-design-switcher]').getBoundingClientRect().top};}''')
    count+=1
    if found['overflow'] or found['h1']!=1 or found['duplicateIds'] or found['designTop']<found['langBottom']:
     errors.append({'route':route,'design':design,'width':width,'findings':found})
  print(route,'done',flush=True)
 b.close()
args.report.write_text(json.dumps({'checks':count,'issues':errors},ensure_ascii=False,indent=2))
print('CHECKS',count,'ISSUES',len(errors));print(json.dumps(errors[:12],ensure_ascii=False,indent=2))

raise SystemExit(1 if errors else 0)
