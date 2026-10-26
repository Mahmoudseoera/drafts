import sys,re
from pathlib import Path
sys.path.insert(0,str(Path('.qa').resolve()))
from bs4 import BeautifulSoup
page=BeautifulSoup(Path('classic-egypt-tour.html').read_text(encoding='utf-8'),'html.parser')
ids=[node['id'] for node in page.select('[id]')]
assert len(ids)==len(set(ids))
assert len(page.select('h1'))==1
assert not page.select('[onclick],a[href="#"]')
assert all(image.get('alt') and image.get('title') for image in page.select('img'))
assert len(page.select('.day'))==8
assert len(page.select('.gal-th button'))==10
assert len(page.select('.rev'))==6
assert len(page.select('.ex'))==5
assert len(page.select('.chip'))==6
assert len(page.select('.day details[open]'))==1
assert not page.select('.layer,.scrim,.win,#heroA,#heroB')
script=page.select('script')[-1].string
assert not re.search(r'const\s+(SC|STOPS|REVIEWS|EX|INTERESTS|MAPBG|RIV|CITIES|REGIONS|PRICE|CURS)\s*=',script)
print('Static checks passed: unique IDs, headings, images, complete inventory, one gallery, no old navigation/map/content arrays.')
