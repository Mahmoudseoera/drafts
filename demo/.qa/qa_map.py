import sys,threading,http.server,json,re,time,urllib.parse
from pathlib import Path
sys.path.insert(0,str(Path('.qa').resolve()))
from playwright.sync_api import sync_playwright
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',8766),Quiet);threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
 page=browser.new_page(viewport={'width':1440,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 url='http://127.0.0.1:8766/classic-egypt-tour.html'
 page.goto(url,wait_until='load');page.locator('.dk[data-open="map"]').click()
 page.wait_for_selector('.tour-marker');assert page.locator('[data-view="map"] .tour-marker').count()==8
 mapview=page.locator('[data-view="map"]');mapview.locator('[data-play]').click();page.wait_for_timeout(3700)
 assert mapview.locator('[data-progress]').input_value()=='1'
 mapview.locator('[data-play]').click();page.wait_for_timeout(3500);assert mapview.locator('[data-progress]').input_value()=='1'
 mapview.locator('[data-step="1"]').click();assert mapview.locator('[data-progress]').input_value()=='2'
 mapview.locator('[data-progress]').fill('6');mapview.locator('[data-play]').click();page.wait_for_timeout(5300)
 assert mapview.locator('[data-progress]').input_value()=='7';assert mapview.locator('[data-play]').inner_text()=='Play tour'
 mapview.locator('[data-play]').click();assert mapview.locator('[data-progress]').input_value()=='0'
 page.locator('.dk[data-open="itinerary"]').click();assert page.locator('[data-view="itinerary"] [data-play]').inner_text()=='Play tour'
 page.locator('.select-day').nth(4).click();assert page.locator('.day.on').get_attribute('data-place')=='Edfu'
 page.locator('[data-view="itinerary"] [data-fit]').click();page.wait_for_timeout(1600)
 marker=page.locator('.leaflet-marker-icon:visible').filter(has_text='2');marker.click(force=True);page.wait_for_timeout(250)
 assert page.locator('.day.on').get_attribute('data-place')=='Giza',page.locator('.day.on').get_attribute('data-place')
 page.locator('#itinList').evaluate('(node)=>node.scrollTop=node.scrollHeight');page.wait_for_timeout(300)
 assert page.locator('[data-view="itinerary"] [data-progress]').input_value()=='7'
 for _ in range(3):
  page.locator('.dk[data-open="map"]').click();page.locator('.dk[data-open="itinerary"]').click()
 assert page.locator('.leaflet-container').count()==2
 page.emulate_media(reduced_motion='reduce');page.locator('.select-day').first.click()
 assert page.locator('.day.on').get_attribute('data-place')=='Cairo'
 # Independently exercise the configurable adapter. These fixtures are NOT live geocoding results.
 content=Path('classic-egypt-tour.html').read_text(encoding='utf-8')
 content=re.sub(r'<template id="resolvedLocations">.*?</template>','<template id="resolvedLocations"></template>',content,flags=re.S)
 content=content.replace('data-geocode-endpoint=""','data-geocode-endpoint="/test-geocode"')
 page.route('**/classic-egypt-tour.html',lambda route:route.fulfill(body=content,content_type='text/html'))
 calls=[]
 def geocode(route):
  calls.append(time.monotonic());query=urllib.parse.parse_qs(urllib.parse.urlparse(route.request.url).query)['q'][0]
  if query.startswith('Aswan Airport'):route.fulfill(json={'lat':None,'lng':None})
  else:route.fulfill(json={'lat':25.7,'lng':32.6})
 page.route('**/test-geocode?*',geocode)
 page.goto(url,wait_until='load');page.locator('.dk[data-open="map"]').click()
 page.wait_for_function("document.querySelector('[data-view=map] [data-geo-status]').textContent.includes('7 of 8')",timeout=25000)
 assert len(calls)==8
 assert all(b-a>=1.0 for a,b in zip(calls,calls[1:])),calls
 page.locator('.dk[data-open="itinerary"]').click();page.wait_for_timeout(500);assert len(calls)==8
 page.reload(wait_until='load');page.wait_for_timeout(500);assert len(calls)==8
 page.locator('[data-view="itinerary"] [data-retry-map]').click();page.wait_for_timeout(1500);assert len(calls)==9
 assert not errors,errors
 browser.close()
server.shutdown()
Path('qa-map-results.json').write_text(json.dumps({'realMapMarkers':8,'playPauseResumeReplay':'passed','markerTimelineSync':'passed','scrollSync':'passed','mapInstancesAfterSwitching':2,'reducedMotion':'passed','adapterFixtureRequests':len(calls),'adapterThrottleAndSuccessFailureCache':'passed','runtimeErrors':errors},indent=2))
print('Map playback, synchronization, resizing, and adapter cache/throttle checks passed.')
