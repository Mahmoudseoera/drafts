// These checks exercise state/data logic with a minimal DOM. They do not
// substitute for visual, keyboard or touch verification in a real browser.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
function setup(stored='[]',blocked=false){
  let written=null;const listeners={};const nodes=new Map();
  const node=()=>({addEventListener(){},querySelector(){return {focus(){}}},querySelectorAll(){return []},classList:{add(){},remove(){},toggle(){}},open:false});
  const document={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},body:node(),activeElement:null};
  const context=vm.createContext({document,window:{addEventListener(k,f){listeners[k]=f}},localStorage:{getItem(){if(blocked)throw Error('disabled');return stored},setItem(k,v){if(blocked)throw Error('disabled');written=v}},Intl,Map,Set,setTimeout:()=>1,clearTimeout(){}});
  vm.runInContext(source.replace('renderCards();sync();',`sync=()=>{}; globalThis.api={toggle,remove,cleanSelection,rows,tours,selected:()=>selected};`),context);
  return {api:context.api,nodes,listeners,written:()=>written};
}
test('six complete cards have existing local images and consistent activity fields',()=>{
  const {api}=setup();assert.equal(api.tours.length,6);
  api.tours.forEach(t=>{for(const k of ['id','title','city','image','alt','description','days','group','price','rating','meals','stay','cancellation','flexibility','pace'])assert.ok(t[k]);assert.ok(fs.existsSync(path.join(__dirname,t.image)));assert.equal(Object.keys(t.activities).length,4);});
});
test('a fourth choice is rejected and current selection is persisted',()=>{
  const f=setup();['nile','dahab','siwa','cairo'].forEach(f.api.toggle);
  assert.deepEqual(Array.from(f.api.selected()),['nile','dahab','siwa']);
  assert.deepEqual(JSON.parse(f.written()),['nile','dahab','siwa']);assert.match(f.nodes.get('toast').textContent,/shortlist is full/);
});
test('toggling and individual removal free a comparison slot',()=>{
  const {api}=setup();['nile','dahab','siwa'].forEach(api.toggle);api.toggle('dahab');api.toggle('cairo');api.remove('nile');
  assert.deepEqual(Array.from(api.selected()),['siwa','cairo']);
});
test('persistence restores only unique known IDs and caps selection at three',()=>{
  const {api}=setup('["nile","missing","nile","siwa","dahab","cairo"]');assert.deepEqual(Array.from(api.selected()),['nile','siwa','dahab']);
  for(const stored of ['invalid','{}','null'])assert.equal(setup(stored).api.selected().length,0);
});
test('blocked storage does not prevent selecting or removing tours',()=>{
  const {api}=setup('[]',true);api.toggle('nile');assert.equal(api.selected().length,1);api.remove('nile');assert.equal(api.selected().length,0);
});
test('difference signatures match identical features and separate different features',()=>{
  const {api}=setup();const cairo=api.tours.find(t=>t.id==='cairo'),alex=api.tours.find(t=>t.id==='alexandria'),nile=api.tours[0];
  api.rows.forEach(row=>assert.equal(JSON.stringify(row.value(cairo)),JSON.stringify(row.value(alex))));
  assert.notEqual(JSON.stringify(api.rows[0].value(cairo)),JSON.stringify(api.rows[0].value(nile)));
});
test('cross-tab clear and malformed state safely reset the selection',()=>{
  const f=setup('["nile"]');f.listeners.storage({key:'egypt-tour-comparison:v1',newValue:'["siwa"]'});assert.deepEqual(Array.from(f.api.selected()),['siwa']);
  f.listeners.storage({key:null,newValue:null});assert.equal(f.api.selected().length,0);
});
