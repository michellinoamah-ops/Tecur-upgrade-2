from html.parser import HTMLParser
from html import escape
import re
TAGS={'p','br','h2','h3','h4','strong','b','em','i','u','s','ul','ol','li','blockquote','a','img','figure','figcaption','table','thead','tbody','tr','td','th','hr','sup','sub'}
def url(s,image=False):
 return bool(re.fullmatch(r'https://[^\s<>]+',s) or re.fullmatch(r'/(?!/)[\w/?#%&=.+-]*',s) or (image and re.fullmatch(r'data:image/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+',s)))
class Safe(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.out=[];self.block=0
 def handle_starttag(self,t,attrs):
  if t in {'script','style','iframe','svg','math','object','template'}:self.block+=1;return
  if self.block or t not in TAGS:return
  a=dict(attrs);items=[]
  if t=='a' and url(a.get('href','')):items.append(('href',a['href']));items.append(('rel','noopener noreferrer'))
  if t=='img':
   if not url(a.get('src',''),True):return
   items.extend([('src',a['src']),('alt',a.get('alt','Article illustration')),('loading','lazy')])
  for k in ['colspan','rowspan']:
   if k in a and a[k].isdigit():items.append((k,str(min(20,max(1,int(a[k]))))))
  self.out.append('<'+t+''.join(' '+k+'="'+escape(v,quote=True)+'"' for k,v in items)+'>')
 def handle_endtag(self,t):
  if t in {'script','style','iframe','svg','math','object','template'}:self.block=max(0,self.block-1);return
  if not self.block and t in TAGS and t not in {'img','br','hr'}:self.out.append('</'+t+'>')
 def handle_data(self,d):
  if not self.block:self.out.append(escape(d))
def sanitize(s):
 p=Safe();p.feed(s);return ''.join(p.out)
