(() => {
'use strict';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const app = $('#app'), root = $('#viewRoot'), days = $$('.day'), photos = $$('.gal-th button');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const state = {activeView: 'overview', stop: 0, gallery: 0, playing: false};
let timer, scrollFrame, scrollLock = false, toastTimer, transition;
const maps = new Map(), resolved = new Map(), pending = new Map();
const money = amount => new Intl.NumberFormat(document.documentElement.lang, {style:'currency',currency:$('#currency').value,maximumFractionDigits:0}).format(amount * Number($('#currency').selectedOptions[0].dataset.rate));
function toast(message) { $('#toast').textContent=message; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500); }

// Expand the real view from the clicked icon into the complete workspace.
// Fixed positioning is temporary so the Dock origin is not clipped by #viewRoot.
function expandFromButton(view, button) {
  const source=$('.dk-ic',button)||button;
  const from=source.getBoundingClientRect(), bounds=root.getBoundingClientRect();
  if(!from.width||!from.height||!root.clientWidth||!root.clientHeight)return;
  const left=bounds.left+root.clientLeft,top=bounds.top+root.clientTop;
  const width=root.clientWidth,height=root.clientHeight;
  const savedStyle=view.getAttribute('style');
  const color=getComputedStyle(view).backgroundColor;
  const background=color==='rgba(0, 0, 0, 0)'?getComputedStyle(root).backgroundColor:color;
  Object.assign(view.style,{position:'fixed',left:`${left}px`,top:`${top}px`,width:`${width}px`,height:`${height}px`,zIndex:'30',margin:'0',transformOrigin:'0 0',backgroundColor:background,willChange:'transform,border-radius',overflow:'hidden'});
  let finished=false;
  const cleanup=()=>{
    if(finished)return;finished=true;
    if(savedStyle===null)view.removeAttribute('style');else view.setAttribute('style',savedStyle);
    if(transition?.view===view)transition=null;
    const entry=maps.get(view.dataset.view);
    if(entry){entry.map.invalidateSize({pan:false});entry.tiles.getMaplibreMap().resize();}
  };
  const animation=view.animate([
    {transform:`translate(${from.left-left}px,${from.top-top}px) scale(${from.width/width},${from.height/height})`,borderRadius:'180px',opacity:1},
    {transform:'translate(0,0) scale(1,1)',borderRadius:getComputedStyle(root).borderRadius,opacity:1}
  ],{duration:620,easing:'cubic-bezier(.19,1,.22,1)',fill:'both'});
  transition={view,animation,cancel(){animation.cancel();cleanup();}};
  animation.finished.then(()=>{cleanup();animation.cancel();},cleanup);
}
window.addEventListener('resize',()=>transition?.cancel());
reduced.addEventListener('change',()=>{if(reduced.matches)transition?.cancel();});
// Persistent server-rendered sections: no content templates or tour datasets in JS.
function setActiveView(name, origin, historyMode = 'push') {
  const next = $(`[data-view="${CSS.escape(name)}"]`); if (!next) return;
  if(name===state.activeView && origin && !next.hidden)return;
  transition?.cancel();
  pauseTour(); state.activeView=name; app.dataset.activeView=name;
  $$('[data-view]').forEach(view=>view.hidden=view!==next);
  $$('.dk').forEach(button=>{const on=button.dataset.open===name; button.classList.toggle('on',on); if(on) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');});
  if(historyMode==='push' && location.hash!==`#${name}`) history.pushState(null,'',`#${name}`);
  if(!reduced.matches && origin)expandFromButton(next,origin);
  const heading=$('h1,h2',next); if(historyMode!=='none')heading?.focus({preventScroll:true});
  requestAnimationFrame(refreshExpanders);
  if(name==='itinerary'||name==='map') { ensureMap(name); requestAnimationFrame(()=>{maps.get(name)?.map.invalidateSize(); if(name==='itinerary') alignTimeline();}); }
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-open]'); if(button){setActiveView(button.dataset.open,button);if(button.dataset.photoIndex)showPhoto(Number(button.dataset.photoIndex));}
  const more=event.target.closest('[data-expand]');
  if(more){const target=document.getElementById(more.dataset.expand), expanded=more.getAttribute('aria-expanded')!=='true'; more.setAttribute('aria-expanded',String(expanded)); target.classList.toggle('expanded',expanded); more.textContent=expanded?'Show less':'Show more';}
});
function refreshExpanders(){
  $$('[data-expand]').forEach(button=>{const target=document.getElementById(button.dataset.expand);if(!target.classList.contains('clamp-content')||!target.clientHeight)return;button.hidden=!target.classList.contains('expanded')&&target.scrollHeight<=target.clientHeight+1;});
}
new ResizeObserver(refreshExpanders).observe(root);
window.addEventListener('popstate',()=>setActiveView(location.hash.slice(1)||'overview',null,'none'));
document.addEventListener('keydown',event=>{
  if(event.key==='Escape') setActiveView('overview',null);
  if(state.activeView==='gallery' && !event.target.matches('input,select,textarea')) {
    if(event.key==='ArrowLeft'){event.preventDefault();showPhoto(state.gallery-1);}
    if(event.key==='ArrowRight'){event.preventDefault();showPhoto(state.gallery+1);}
  }
});
function showPhoto(index){
  state.gallery=(index+photos.length)%photos.length;
  const thumb=$('img',photos[state.gallery]), image=$('#galImg');
  image.src=thumb.dataset.full||thumb.src; image.alt=thumb.alt; image.title=thumb.title;
  image.dataset.fallback=thumb.dataset.fallback||'';
  $('#galCap b').textContent=thumb.alt; $('#galCap span').textContent=photos[state.gallery].dataset.caption;
  $('#galCnt').textContent=`${state.gallery+1} / ${photos.length}`;
  const credit=$('#photoCredit');if(credit){credit.textContent=photos[state.gallery].dataset.credit||'';credit.href=photos[state.gallery].dataset.source||'';}
  photos.forEach((button,i)=>{button.classList.toggle('on',i===state.gallery);button.setAttribute('aria-pressed',String(i===state.gallery));});
  photos[state.gallery].scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
}
photos.forEach((button,i)=>button.addEventListener('click',()=>showPhoto(i)));
$$('[data-gd]').forEach(button=>button.addEventListener('click',()=>showPhoto(state.gallery+Number(button.dataset.gd))));
let touchX=null;
$('.gal-main').addEventListener('touchstart',e=>{touchX=e.touches[0].clientX;},{passive:true});
$('.gal-main').addEventListener('touchend',e=>{if(touchX!==null){const delta=e.changedTouches[0].clientX-touchX;if(Math.abs(delta)>50)showPhoto(state.gallery+(delta<0?1:-1));touchX=null;}},{passive:true});
document.addEventListener('error',event=>{const image=event.target;if(image.tagName!=='IMG')return;if(image.dataset.fallback && image.src!==image.dataset.fallback){image.src=image.dataset.fallback;image.dataset.fallback='';}else{image.classList.add('image-unavailable');image.alt=`Image unavailable: ${image.alt}`;}},true);

// Provider configuration is server-editable HTML. No direct public Nominatim requests.
const config=$('#mapConfig').dataset;
let geoQueue=Promise.resolve(), lastRequest=0, resolving=null;
const normalize=value=>{
  if(!value || value.lat==null || value.lng==null || value.lat==='' || value.lng==='')return null;
  const lat=Number(value.lat),lng=Number(value.lng);
  return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180&&!(lat===0&&lng===0)?[lat,lng]:null;
};
function queryFor(day){return [day.dataset.place,day.dataset.region,day.dataset.country].filter(Boolean).join(', ');}
// An optional server-rendered cache is independent of editable itinerary content.
$$('[data-query]',$('#resolvedLocations').content).forEach(node=>{const point=normalize(node.dataset);if(point)resolved.set(node.dataset.query,point);});
function cacheKey(query){return `tour-geocode-v2:${config.geocodeEndpoint}:${query.toLowerCase()}`;}
function readCache(query){try{const item=JSON.parse(localStorage.getItem(cacheKey(query)));if(item && item.expires>Date.now())return item;}catch{}return null;}
function writeCache(query,value,status){try{localStorage.setItem(cacheKey(query),JSON.stringify({value,status,expires:Date.now()+(value?30*86400000:300000)}));}catch{}}
async function geocodePlace(query,retry=false){
  if(pending.has(query))return pending.get(query);
  const cached=readCache(query);if(!retry&&cached)return cached;
  if(!config.geocodeEndpoint)return {value:null,status:'unconfigured'};
  if(!navigator.onLine)return {value:null,status:'offline'};
  const job=geoQueue.then(async()=>{
    await new Promise(resolve=>setTimeout(resolve,Math.max(0,Number(config.geocodeInterval)-Date.now()+lastRequest)));
    lastRequest=Date.now();
    try{
      const endpoint=new URL(config.geocodeEndpoint,location.href);endpoint.searchParams.set('q',query);
      const response=await fetch(endpoint,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const body=await response.json(), value=normalize(body), status=value?'ok':'no-match';
      writeCache(query,value,status);return {value,status};
    }catch(error){const status=navigator.onLine?'error':'offline';writeCache(query,null,status);return {value:null,status};}
  });
  geoQueue=job.catch(()=>{});pending.set(query,job);
  try{return await job;}finally{pending.delete(query);}
}
function mapMessage(message){$$('[data-geo-status]').forEach(node=>node.textContent=message);}
async function resolveStops(retry=false){
  if(resolving)return resolving;
  resolving=(async()=>{
    mapMessage('Locating tour stops…');
    for(const day of days){
      const query=queryFor(day);if(resolved.has(query))continue;
      const override=normalize({lat:day.dataset.lat,lng:day.dataset.lng});
      const result=override?{value:override,status:'ok'}:await geocodePlace(query,retry);
      if(result.value)resolved.set(query,result.value);
      day.dataset.locationStatus=result.status;
    }
    const count=days.filter(day=>resolved.has(queryFor(day))).length;
    mapMessage(count===days.length?'Overview connections only — not a driving or river-navigation route.':!config.geocodeEndpoint? 'Tour stop locations are not available yet. You can still explore the map and itinerary.':!navigator.onLine?'You are offline. Reconnect and retry locations.':`${count} of ${days.length} stops located. Some places could not be found. Retry locations.`);
    maps.forEach(renderMapStops);updatePlay();
  })();
  try{await resolving;}finally{resolving=null;}
}
function ensureMap(name){
  const host=$(`[data-map="${name}"]`);
  if(maps.has(name)){const entry=maps.get(name);entry.map.invalidateSize();const point=resolved.get(queryFor(days[state.stop]));if(point)entry.map.flyTo(point,10,{animate:!reduced.matches,duration:1.2});return;}
  if(!window.L?.maplibreGL||!window.maplibregl){$('[data-tile-status]',host.parentElement).textContent='Map library could not load. Check your connection and retry.';return;}
  const map=L.map(host,{zoomControl:true,keyboard:true,zoomAnimation:!reduced.matches,fadeAnimation:!reduced.matches}).setView([Number(config.centerLat),Number(config.centerLng)],Number(config.zoom));
  const status=$('[data-tile-status]',host.parentElement);
  let tiles;
  try{
    tiles=L.maplibreGL({style:config.styleUrl,interactive:false,attributionControl:false,padding:0,maxZoom:Number(config.maxZoom)}).addTo(map);
  }catch(error){map.remove();status.textContent='The map could not start. Enable WebGL / hardware acceleration in your browser, then retry.';return;}
  map.attributionControl.addAttribution($('#mapAttribution').innerHTML);
  const entry={map,tiles,host,markers:new Map(),segments:L.layerGroup().addTo(map),fitted:false,failed:false};maps.set(name,entry);
  const basemap=tiles.getMaplibreMap();
  status.textContent='Loading map…';
  basemap.on('error',event=>{
    entry.failed=true;
    status.textContent=event.error?.status===403?'The map provider refused access (403). Check your connection or provider configuration, then retry.':'Some map data could not load. Check your connection and retry.';
  });
  basemap.on('idle',()=>{if(!entry.failed){status.textContent='';host.dataset.mapLoaded='true';}});
  map.on('dragstart',pauseTour);
  new ResizeObserver(()=>{map.invalidateSize({pan:false});basemap.resize();}).observe(host);
  renderMapStops(entry);resolveStops();
}
function renderMapStops(entry){
  days.forEach((day,index)=>{
    const coordinate=resolved.get(queryFor(day));if(!coordinate||entry.markers.has(index))return;
    const content=document.createElement('div'),heading=document.createElement('strong'),description=document.createElement('p');
    heading.textContent=`${$('.day-n',day).textContent} · ${day.dataset.place}`;description.textContent=$('.day-sub',day).textContent;
    const image=$('img',day).cloneNode();image.removeAttribute('class');image.width=150;image.height=90;
    content.append(heading,description,image);
    const marker=L.marker(coordinate,{icon:markerIcon(index),title:heading.textContent,alt:heading.textContent,keyboard:true}).addTo(entry.map).bindPopup(content);
    marker.on('click',()=>selectStop(index,{scroll:true,manual:true}));entry.markers.set(index,marker);
  });
  if(!entry.fitted && entry.markers.size){fitRoute(entry);entry.fitted=true;}
  paintRoute(entry);
}
function markerIcon(index){return L.divIcon({className:`tour-marker ${index===state.stop?'current':index<state.stop?'done':''}`,html:`<span>${index+1}</span>`,iconSize:[30,30],iconAnchor:[15,15]});}
function paintRoute(entry){
  entry.markers.forEach((marker,index)=>{marker.setIcon(markerIcon(index));marker.setZIndexOffset(index===state.stop?1000:0);});
  entry.segments.clearLayers();
  // Only connect adjacent resolved stops. Never invent geometry through missing stops.
  for(let i=1;i<days.length;i++){
    const previous=resolved.get(queryFor(days[i-1])),current=resolved.get(queryFor(days[i]));
    if(previous&&current)L.polyline([previous,current],{color:i<=state.stop?'#0e6b7b':'#7f939b',weight:i<=state.stop?4:3,dashArray:'7 7'}).addTo(entry.segments);
  }
}
function fitRoute(entry){const points=[...entry.markers.values()].map(marker=>marker.getLatLng());if(points.length)entry.map.fitBounds(L.latLngBounds(points),{padding:[40,40],maxZoom:11,animate:!reduced.matches});}
$$('[data-fit]').forEach(button=>button.addEventListener('click',()=>{pauseTour();const entry=maps.get(state.activeView);if(entry)fitRoute(entry);}));
$$('[data-retry-map]').forEach(button=>button.addEventListener('click',()=>{
  if(!window.L?.maplibreGL||!window.maplibregl){location.reload();return;}
  const entry=maps.get(state.activeView);
  if(entry){entry.failed=false;entry.host.dataset.mapLoaded='false';$('[data-tile-status]',entry.host.parentElement).textContent='Loading map…';entry.tiles.getMaplibreMap().setStyle(config.styleUrl,{diff:false});}
  else ensureMap(state.activeView);
  resolveStops(true);
}));
function alignTimeline(){
  if(state.activeView!=='itinerary')return;
  scrollLock=true;
  const list=$('#itinList'),card=days[state.stop];
  list.scrollTo({top:list.scrollTop+card.getBoundingClientRect().top-list.getBoundingClientRect().top-10,behavior:'instant'});
  // Instant programmatic scroll + two paint frames make cleanup independent of a guessed animation timeout.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{scrollLock=false;}));
}
function selectStop(index,{scroll=false,manual=false}={}){
  if(manual)pauseTour();
  state.stop=Math.max(0,Math.min(days.length-1,index));
  days.forEach((day,i)=>{day.classList.toggle('on',i===state.stop);day.classList.toggle('done',i<state.stop);$('.select-day',day).setAttribute('aria-pressed',String(i===state.stop));});
  $$('[data-stop]').forEach(button=>{button.classList.toggle('on',Number(button.dataset.stop)===state.stop);button.setAttribute('aria-pressed',String(Number(button.dataset.stop)===state.stop));});
  maps.forEach((entry,name)=>{
    paintRoute(entry);
    const position=resolved.get(queryFor(days[state.stop]));
    if(position&&name===state.activeView){entry.map.stop();entry.map.flyTo(position,10,{animate:!reduced.matches,duration:1.2});}
  });
  if(scroll)alignTimeline();updatePlay();
}
days.forEach((day,index)=>$('.select-day',day).addEventListener('click',()=>selectStop(index,{manual:true})));
$$('[data-stop]').forEach(button=>button.addEventListener('click',()=>selectStop(Number(button.dataset.stop),{scroll:true,manual:true})));
$('#itinList').addEventListener('scroll',()=>{
  if(scrollLock||state.activeView!=='itinerary')return;
  cancelAnimationFrame(scrollFrame);scrollFrame=requestAnimationFrame(()=>{
    if(scrollLock)return;
    const list=$('#itinList'),bounds=list.getBoundingClientRect(),anchor=bounds.top+Math.min(80,bounds.height*.25);
    let best=state.stop,distance=Infinity;
    days.forEach((day,index)=>{const rect=day.getBoundingClientRect();if(rect.bottom>bounds.top&&rect.top<bounds.bottom){const delta=Math.abs(rect.top-anchor);if(delta<distance){distance=delta;best=index;}}});
    if(list.scrollTop+list.clientHeight>=list.scrollHeight-2)best=days.length-1;
    if(best!==state.stop)selectStop(best,{manual:true});
  });
},{passive:true});
$('#toggleDays').addEventListener('click',event=>{const open=event.currentTarget.getAttribute('aria-expanded')!=='true';$$('.day details').forEach(details=>details.open=open);event.currentTarget.setAttribute('aria-expanded',String(open));event.currentTarget.textContent=open?'Close all days':'Open all days';});
function updatePlay(){
  $$('[data-play]').forEach(button=>{button.textContent=state.playing?'Pause':'Play tour';button.setAttribute('aria-pressed',String(state.playing));});
  $$('[data-progress]').forEach(range=>{range.max=days.length-1;range.value=state.stop;range.setAttribute('aria-valuetext',`${$('.day-n',days[state.stop]).textContent}, ${days[state.stop].dataset.place}`);});
  $$('[data-current-stop]').forEach(node=>node.textContent=`${$('.day-n',days[state.stop]).textContent} · ${days[state.stop].dataset.place}`);
  $$('[data-count]').forEach(node=>node.textContent=`${state.stop+1} / ${days.length}`);
  $$('[data-step="-1"]').forEach(button=>button.disabled=state.stop===0);
  $$('[data-step="1"]').forEach(button=>button.disabled=state.stop===days.length-1);
}
function pauseTour(){clearTimeout(timer);timer=null;state.playing=false;maps.forEach(entry=>entry.map.stop());updatePlay();}
function playTour(){
  if(state.playing)return;
  if(days.some(day=>!resolved.has(queryFor(day)))){toast('Playback needs tour stop locations. Retry locations when the service is available.');return;}
  if(state.stop===days.length-1)selectStop(0,{scroll:true});else selectStop(state.stop,{scroll:true});
  state.playing=true;updatePlay();
  const advance=()=>{if(!state.playing)return;if(state.stop>=days.length-1){pauseTour();return;}selectStop(state.stop+1,{scroll:true});if(state.stop===days.length-1){timer=setTimeout(pauseTour,1500);}else timer=setTimeout(advance,3400);};
  timer=setTimeout(advance,3400);
}
$$('[data-play]').forEach(button=>button.addEventListener('click',()=>state.playing?pauseTour():playTour()));
$$('[data-step]').forEach(button=>button.addEventListener('click',()=>selectStop(state.stop+Number(button.dataset.step),{scroll:true,manual:true})));
$$('[data-progress]').forEach(range=>range.addEventListener('input',()=>selectStop(Number(range.value),{scroll:true,manual:true})));
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseTour();});
window.addEventListener('pagehide',pauseTour);

function selectedExtras(){return $$('.ex[aria-pressed="true"]');}
function quote(){
  const adults=Number($('#adults').value),children=Number($('#children').value),price=Number(app.dataset.price),childPrice=Math.round(price*Number(app.dataset.childFactor));
  const extra=selectedExtras().reduce((sum,node)=>sum+Number(node.dataset.price),0);
  return {adults,children,price,childPrice,extra,total:adults*price+children*childPrice+(adults+children)*extra};
}
function renderBook(){
  const q=quote();$$('[data-from]').forEach(node=>node.textContent=money(q.price));
  $$('[data-total]').forEach(node=>node.textContent=money(q.total));
  $$('[data-usd]').forEach(node=>node.textContent=(node.dataset.pre||'')+money(Number(node.dataset.usd)));
  $$('[data-date-summary]').forEach(node=>node.textContent=$('#travelDate').value||'Choose a date');
  $$('[data-trav-summary]').forEach(node=>node.textContent=`${q.adults} adults · ${q.children} children`);
  $('#adultCost').textContent=`${q.adults} × ${money(q.price)}`;$('#childCost').textContent=`${q.children} × ${money(q.childPrice)}`;
  $('#extraCost').textContent=money(q.extra*(q.adults+q.children));
  $('#selectedExtras').textContent=selectedExtras().map(node=>$('b',node).textContent).join(', ')||'None selected';
  $('#exNote').hidden=!selectedExtras().length;$('#exNote').textContent=`Extras: +${money(q.extra)} per person`;
  if(!$('#czOut').hidden)renderPlan();
}
function renderPlan(){
  const list=$('#planList');list.replaceChildren();
  $$('.chip[aria-pressed="true"]').forEach(node=>{const li=document.createElement('li');li.textContent=node.dataset.description;list.append(li);});
  selectedExtras().forEach(node=>{const li=document.createElement('li');li.textContent=`${$('b',node).textContent}: ${$('small',node).textContent}`;list.append(li);});
}
$$('.ex,.chip').forEach(button=>button.addEventListener('click',()=>{button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true'));renderBook();}));
$('#czGo').addEventListener('click',()=>{if(!$('.chip[aria-pressed="true"]')){toast('Pick at least one interest');return;}$('#czOut').hidden=false;renderPlan();$('#czOut').scrollIntoView({block:'nearest',behavior:reduced.matches?'instant':'smooth'});});
$$('#travelDate,#adults,#children,#currency').forEach(input=>input.addEventListener('change',renderBook));
const today=new Date();$('#travelDate').min=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
$$('[data-numeric]').forEach(input=>input.addEventListener('input',()=>input.value=input.value.replace(/\D/g,'')));
$('#bkForm').addEventListener('submit',event=>{
  event.preventDefault();if(!event.currentTarget.reportValidity())return;
  const q=quote();
  const summary=`${$('h1').textContent}\nTravel date: ${$('#travelDate').value}\nTravelers: ${q.adults} adults, ${q.children} children\nExtras: ${$('#selectedExtras').textContent}\nInterests: ${$$('.chip[aria-pressed="true"]').map(node=>node.textContent).join(', ')}\nEstimated total: ${money(q.total)}`;
  // Keep contact details out of URLs and browser storage. No backend submission is implied.
  try{sessionStorage.setItem('tour-inquiry-preview',summary);}catch{}
  location.assign(event.currentTarget.action);
});
$('#shareBtn').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);toast('Tour link copied');}catch{toast('Copy the tour link from your address bar.');}});
$('#favBtn').addEventListener('click',event=>{const button=event.currentTarget,on=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(on));toast(on?'Saved for this visit':'Removed from saved tours');});
$$('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(button.dataset.copy);toast('Copied');}catch{toast('Select the contact text to copy it.');}}));
// Search metadata derives from the same rendered content; Blade can emit this server-side later.
const schema={'@context':'https://schema.org','@type':'TouristTrip',name:$('h1').textContent,description:$('.lead').textContent,image:$('#coverImage').src,itinerary:{'@type':'ItemList',itemListElement:days.map((day,index)=>({'@type':'ListItem',position:index+1,item:{'@type':'TouristAttraction',name:$('.day-title',day).textContent,address:{'@type':'PostalAddress',addressCountry:day.dataset.country}}}))},offers:{'@type':'Offer',price:app.dataset.price,priceCurrency:app.dataset.currency}};
$('#tourSchema').textContent=JSON.stringify(schema);
$('meta[name="description"]').content=schema.description;$('meta[property="og:title"]').content=schema.name;$('meta[property="og:description"]').content=schema.description;$('meta[property="og:image"]').content=schema.image;
document.title=schema.name;
showPhoto(0);renderBook();selectStop(0);setActiveView(location.hash.slice(1)||'overview',null,'none');
})();
