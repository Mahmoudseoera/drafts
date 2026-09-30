// State tests with no animation CDN available; browser motion QA is separate.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function setup(){
  const frames=new Map();let frameId=0,clock=0;
  const node=()=>({events:{},attrs:{},style:{},open:false,textContent:'',content:'Four days along the Nile',classList:{add(){},remove(){}},addEventListener(k,f){this.events[k]=f},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},append(){},focus(){},scrollIntoView(){}});
  const details=Array.from({length:4},(_,i)=>({...node(),open:i===0}));
  const links=Array.from({length:4},node);
  const days=Array.from({length:4},(_,i)=>({...node(),querySelector(){return {textContent:`DAY ${i+1} · Place ${i+1}`}}}));
  const nodes=new Map();
  const document={...node(),head:node(),hidden:false,createElement:node,querySelector(s){if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)},querySelectorAll(s){return s==='.day details'?details:s==='.day-nav a'?links:s==='.day'?days:[]}};
  const audio=document.querySelector('#ambient-audio');Object.assign(audio,{volume:0,paused:true,play(){audio.paused=false;return Promise.resolve()},pause(){audio.paused=true}});
  const window={...node(),matchMedia:()=>({...node(),matches:false}),scrollTo(){}};
  const context=vm.createContext({window,document,performance:{now:()=>clock},requestAnimationFrame:f=>{const id=++frameId;frames.set(id,f);return id},cancelAnimationFrame:id=>frames.delete(id)});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'app.js'),'utf8'),context);
  return {document,window,details,audio,nodes,async clickSound(){await nodes.get('#sound-toggle').events.click()},advance(ms){clock+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(f=>f(clock))}};
}
test('CDN failure leaves controls usable and the first itinerary open',()=>{
  const f=setup();assert.deepEqual(f.details.map(d=>d.open),[true,false,false,false]);
  f.nodes.get('#toggle-days').events.click();assert.ok(f.details.every(d=>d.open));
  f.nodes.get('#toggle-days').events.click();assert.ok(f.details.every(d=>!d.open));
});
test('ambient sound is initially paused and fades in and out on request',async()=>{
  const f=setup();assert.equal(f.audio.paused,true);await f.clickSound();f.advance(800);assert.equal(f.audio.volume,.3);assert.equal(f.audio.paused,false);
  await f.clickSound();f.advance(800);assert.equal(f.audio.volume,0);assert.equal(f.audio.paused,true);
});
test('rapid sound toggling ends in the requested state',async()=>{
  const f=setup();await f.clickSound();f.advance(250);await f.clickSound();f.advance(150);await f.clickSound();f.advance(800);
  assert.equal(f.audio.paused,false);assert.equal(f.audio.volume,.3);assert.equal(f.nodes.get('#sound-toggle').attrs['aria-pressed'],'true');
});
test('blocked playback resets the toggle and announces an error',async()=>{
  const f=setup();f.audio.play=()=>Promise.reject(Error('NotAllowedError'));await f.clickSound();assert.equal(f.audio.paused,true);assert.equal(f.nodes.get('#sound-toggle').attrs['aria-pressed'],'false');assert.match(f.nodes.get('#audio-status').textContent,/could not start/);
});
test('hiding the document stops audio without an automatic resume',async()=>{
  const f=setup();await f.clickSound();f.advance(800);f.document.hidden=true;f.document.events.visibilitychange();assert.equal(f.audio.paused,true);assert.equal(f.audio.volume,0);f.document.hidden=false;f.document.events.visibilitychange();assert.equal(f.audio.paused,true);
});
test('every local image and audio reference exists and audio is a valid WAV',()=>{
  const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
  for(const match of html.matchAll(/(?:src|href)="((?:images|audio)\/[^\"]+)"/g))assert.ok(fs.existsSync(path.join(__dirname,match[1])),match[1]);
  const audio=fs.readFileSync(path.join(__dirname,'audio/river-ambience.wav'));assert.equal(audio.toString('ascii',0,4),'RIFF');assert.equal(audio.toString('ascii',8,12),'WAVE');assert.equal(audio.readUInt32LE(24),22050);
});
