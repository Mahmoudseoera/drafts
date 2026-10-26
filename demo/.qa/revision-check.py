import sys,threading,http.server,json
from pathlib import Path
sys.path.insert(0,str(Path('.qa').resolve()))
from playwright.sync_api import sync_playwright
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',8770),Quiet)
threading.Thread(target=server.serve_forever,daemon=True).start()
report=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
 page=browser.new_page(viewport={'width':1440,'height':900})
 errors=[];responses=[];requests=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda request:requests.append(request.url))
 page.on('response',lambda response:responses.append((response.status,response.url)) if response.status>=400 else None)
 for width,height in [(1440,900),(390,844)]:
  page.set_viewport_size({'width':width,'height':height})
  page.goto('http://127.0.0.1:8770/classic-egypt-tour.html',wait_until='load')
  geometry=page.evaluate('''() => {
   const button=document.querySelector('.dk[data-open="gallery"]');
   const from=button.querySelector('.dk-ic').getBoundingClientRect().toJSON();button.click();
   const view=document.querySelector('[data-view="gallery"]');
   const animation=view.getAnimations()[0];animation.pause();animation.currentTime=0;
   return {from,start:view.getBoundingClientRect().toJSON()};
  }''')
  for key in ['x','y','width','height']:assert abs(geometry['from'][key]-geometry['start'][key])<2,(key,geometry)
  page.evaluate("document.querySelector('[data-view=gallery]').getAnimations()[0].currentTime=75")
  page.screenshot(path=f'.qa/expand-{width}-mid.png')
  page.evaluate("document.querySelector('[data-view=gallery]').getAnimations()[0].finish()")
  page.wait_for_timeout(80)
  assert page.locator('[data-view="gallery"]').evaluate("el=>getComputedStyle(el).position")=='relative'
  target=page.locator('#viewRoot').bounding_box();view=page.locator('[data-view="gallery"]').bounding_box()
  assert abs(target['width']-view['width'])<=2 and abs(target['height']-view['height'])<=2
  page.evaluate("document.querySelector('.dk[data-open=reviews]').click();document.querySelector('.dk[data-open=included]').click();document.querySelector('.dk[data-open=map]').click()")
  page.wait_for_timeout(750)
  assert page.locator('[data-view]:visible').count()==1
  assert page.locator('[data-view][style*="position: fixed"]').count()==0
  page.wait_for_function("document.querySelector('[data-map=map]').dataset.mapLoaded==='true'",timeout=60000)
  assert page.locator('[data-view="map"] .tour-marker').count()==8
  assert page.locator('[data-view="map"] [data-tile-status]').inner_text()==''
  assert 'OpenMapTiles' in page.locator('[data-view="map"] .leaflet-control-attribution').inner_text()
  page.screenshot(path=f'.qa/openfreemap-{width}.png')
  page.locator('[data-view="map"] [data-play]').click();page.wait_for_timeout(3600)
  assert page.locator('[data-view="map"] [data-progress]').input_value()=='1'
  page.locator('.dk[data-open="itinerary"]').click();page.wait_for_timeout(750)
  assert page.locator('[data-view="itinerary"] [data-play]').inner_text()=='Play tour'
  page.wait_for_function("document.querySelector('[data-map=itinerary]').dataset.mapLoaded==='true'",timeout=60000)
  assert page.locator('.leaflet-container').count()==2
  page.emulate_media(reduced_motion='reduce');page.locator('.dk[data-open="included"]').click()
  assert page.locator('[data-view="included"]').evaluate('el=>el.getAnimations().length')==0
  page.emulate_media(reduced_motion='no-preference')
  report.append({'viewport':[width,height],'animationStartMatchesButton':True,'animationEndFillsWorkspace':True,'mapLoaded':True})
 page.goto(Path('classic-egypt-tour.html').resolve().as_uri(),wait_until='load')
 page.locator('.dk[data-open="map"]').click()
 page.wait_for_function("document.querySelector('[data-map=map]').dataset.mapLoaded==='true'",timeout=60000)
 page.screenshot(path='.qa/openfreemap-file-preview.png')
 report.append({'directFilePreviewMap':'loaded','pageErrors':errors,'httpErrors':responses,'directOSMTileRequests':sum('tile.openstreetmap.org' in url for url in requests)})
 print(json.dumps(report,indent=2))
 assert not errors,errors
 assert not any('tile.openstreetmap.org' in url for url in requests)
 assert not any(status==403 for status,url in responses),responses
 browser.close()
server.shutdown()
Path('.qa/revision-results.json').write_text(json.dumps(report,indent=2))
