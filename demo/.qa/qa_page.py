import sys, threading, http.server, json, time
from pathlib import Path
sys.path.insert(0,str(Path('.qa').resolve()))
from playwright.sync_api import sync_playwright
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',8765),Quiet)
threading.Thread(target=server.serve_forever,daemon=True).start()
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
 page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto('http://127.0.0.1:8765/classic-egypt-tour.html',wait_until='networkidle')
 page.screenshot(path='qa-desktop.png')
 assert page.locator('[data-view]:visible').count()==1
 assert page.locator('h1').count()==1
 assert page.locator('.hero img').count()==1
 for name in ['itinerary','gallery','map','included','reviews','customize','desk','overview']:
  page.locator(f'.dk[data-open="{name}"]').click()
  page.wait_for_timeout(350)
  assert page.locator('[data-view]:visible').count()==1,name
  assert page.locator(f'[data-view="{name}"]').is_visible(),name
  assert page.locator('.dock').is_visible()
  assert page.locator('[role="dialog"],.scrim,.layer').count()==0
  if name=='map':
   page.screenshot(path='qa-map.png')
   results.append({'mapLibrary':page.evaluate('Boolean(window.L)'),'tiles':page.locator('.leaflet-tile-loaded').count()})
 page.locator('.dk[data-open="gallery"]').click();page.locator('[data-gd="1"]').click();assert page.locator('#galCnt').inner_text()=='2 / 10'
 page.keyboard.press('ArrowRight');assert page.locator('#galCnt').inner_text()=='3 / 10'
 page.locator('.dk[data-open="customize"]').click();page.locator('.ex').first.click();page.locator('#czGo').click()
 assert page.locator('#czOut').is_visible()
 page.locator('#czOut [data-open="book"]').click()
 assert '$2,838' in page.locator('[data-view="book"] [data-total]').inner_text()
 page.locator('#children').fill('1');page.locator('#children').dispatch_event('change')
 assert '$3,867' in page.locator('[data-view="book"] [data-total]').inner_text()
 page.locator('#travelDate').fill('2027-02-15');page.locator('#bkName').fill('Preview Test');page.locator('#bkEmail').fill('preview@example.test')
 page.locator('#countryCode').fill('20');page.locator('#bkPhone').fill('123abc456789');assert page.locator('#bkPhone').input_value()=='123456789'
 page.locator('#bkForm button[type="submit"]').click();page.wait_for_url('**/thank-you.html')
 assert 'Nothing has been sent' in page.locator('main').inner_text();assert '2027-02-15' in page.locator('#summary').inner_text()
 page.screenshot(path='qa-thank-you.png')
 for width,height in [(390,844),(320,740),(768,1024)]:
  page.set_viewport_size({'width':width,'height':height});page.goto('http://127.0.0.1:8765/classic-egypt-tour.html',wait_until='networkidle')
  for name in ['overview','itinerary','gallery','map','included','reviews','customize','desk','book']:
   page.locator(f'[data-open="{name}"]:visible').first.click()
   page.wait_for_timeout(320)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,name,'horizontal overflow')
   bounds=page.locator('#viewRoot').bounding_box();dock=page.locator('.dock').bounding_box()
   assert bounds['y']+bounds['height']<=dock['y']+1,(width,name,'dock overlap')
   if width==390 and name in ['overview','itinerary','gallery','book']:page.screenshot(path=f'qa-mobile-{name}.png')
 results.append({'runtimeErrors':errors})
 assert not errors,errors
 browser.close()
server.shutdown()
Path('qa-results.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2));print('Desktop, mobile, gallery, customization and booking checks passed.')
