from pathlib import Path
from html.parser import HTMLParser
import json,re,sys
root=Path('dist');errors=[];pages=list(root.rglob('*.html'))
class Check(HTMLParser):
 def __init__(self):super().__init__();self.h1=0;self.title=False;self.desc=False;self.links=[]
 def handle_starttag(self,t,a):
  a=dict(a)
  if t=='h1':self.h1+=1
  if t=='title':self.title=True
  if t=='meta' and a.get('name')=='description':self.desc=bool(a.get('content'))
  if t=='a' and a.get('href','').startswith('/'):self.links.append(a['href'])
  if t=='img' and not a.get('alt'):errors.append('Image missing alt')
for path in pages:
 p=Check();p.feed(path.read_text())
 if p.h1!=1 or not p.title or not p.desc:errors.append(f'Metadata/headings: {path}')
 for link in p.links:
  link=link.split('?')[0].split('#')[0]
  target=root/link.strip('/')
  if not target.is_file() and not (target/'index.html').is_file():errors.append(f'Broken internal link {link} in {path}')
 for raw in re.findall(r'<script type="application/ld\+json">(.*?)</script>',path.read_text()):json.loads(raw)
for x in ['admin','listing']:
 if 'noindex' not in (root/x/'index.html').read_text():errors.append(f'{x} must be noindex')
print(f'Checked {len(pages)} HTML files: internal links, titles, descriptions, H1s, alt text and JSON-LD.')
if errors:print('\n'.join(errors));sys.exit(1)
print('All checks passed.')
