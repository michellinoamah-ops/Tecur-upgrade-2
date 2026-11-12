import json,os,subprocess
from pathlib import Path
p=Path('data/catalog.json');original=p.read_text()
try:
 data=json.loads(original)
 data.append({**(data[0] if data else {}),'id':'private-draft-check','title':'PRIVATE_DRAFT_SENTINEL','status':'draft'})
 p.write_text(json.dumps(data));subprocess.run(['python3','scripts/build.py'],check=True)
 assert not Path('dist/parts/private-draft-check/index.html').exists()
 assert 'PRIVATE_DRAFT_SENTINEL' not in Path('dist/assets/catalog.json').read_text()
 assert 'Disallow: /\n' in Path('dist/robots.txt').read_text()
 data[-1]['id']='../escape';data[-1]['status']='published';p.write_text(json.dumps(data))
 result=subprocess.run(['python3','scripts/build.py'],capture_output=True)
 assert result.returncode!=0
 print('Build security passed: drafts excluded, preview noindex, traversal IDs rejected.')
finally:
 p.write_text(original);subprocess.run(['python3','scripts/build.py'],check=True)
