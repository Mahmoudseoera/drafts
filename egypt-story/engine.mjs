import {experiences,byId,cities} from './catalog.mjs';
export const fresh=()=>({version:2,traveler:{name:''},preferences:{history:0,adventure:0,relaxation:0,culture:0,food:0,beach:0,luxury:0,budget:0},travelStyle:{pace:null,comfort:null,experienceDensity:null},destinations:[],selectedExperiences:[],suggestedExperiences:[],excludedExperiences:[],unlockedContent:[],travelDetails:{duration:null,travelers:null,travelDate:null},gameHistory:[],games:{},activeGame:'archaeologist',started:false});
export function applyTripEffects(state,effects){const s=structuredClone(state);for(const e of effects){const id=e.experienceId;
 if(e.type==='boost_preference'&&Object.hasOwn(s.preferences,e.key)&&Number.isFinite(e.value))s.preferences[e.key]=Math.max(0,Math.min(100,s.preferences[e.key]+e.value));
 if(e.type==='set_preference'&&Object.hasOwn(s.travelStyle,e.key)&&['slow','balanced','fast','simple','comfortable','luxury','light','full'].includes(e.value))s.travelStyle[e.key]=e.value;
 if(e.type==='select_experience'&&byId(id)){s.selectedExperiences.push(id);s.excludedExperiences=s.excludedExperiences.filter(x=>x!==id);}
 if(e.type==='exclude_experience'&&byId(id)){s.excludedExperiences.push(id);s.selectedExperiences=s.selectedExperiences.filter(x=>x!==id);}
 if(e.type==='add_suggestion'&&byId(id))s.suggestedExperiences.push(id);
 if(e.type==='unlock_content'&&byId(e.contentId))s.unlockedContent.push(e.contentId);
 if(e.type==='add_destination'&&cities.includes(e.destinationId))s.destinations.push(e.destinationId);
 if(e.type==='remove_destination')s.destinations=s.destinations.filter(x=>x!==e.destinationId);
 }return derive(s);}
export function derive(s){for(const k of ['selectedExperiences','excludedExperiences','unlockedContent','destinations'])s[k]=[...new Set(s[k])];
 const ranked=experiences.filter(x=>(!x.secret||s.unlockedContent.includes(x.id))&&!s.selectedExperiences.includes(x.id)&&!s.excludedExperiences.includes(x.id)).map(x=>({id:x.id,score:x.tags.reduce((n,t)=>n+s.preferences[t],0)})).sort((a,b)=>b.score-a.score);
 s.suggestedExperiences=[...new Set([...ranked.filter(x=>x.score>0).map(x=>x.id),...s.suggestedExperiences,...s.unlockedContent])].filter(id=>byId(id)&&!s.selectedExperiences.includes(id)&&!s.excludedExperiences.includes(id));
 const route=[...new Set([...s.destinations,...s.selectedExperiences.map(id=>byId(id).city)])];
 s.itinerary=route.map(city=>({city,experiences:s.selectedExperiences.filter(id=>byId(id).city===city)}));
 const top=Object.keys(s.preferences).sort((a,b)=>s.preferences[b]-s.preferences[a])[0];s.personality={type:s.preferences[top]?top:null,title:s.preferences[top]?({history:'The Ancient Explorer',adventure:'The Desert Wanderer',relaxation:'The Nile Dreamer',culture:'The Local Storyteller',food:'The Flavor Seeker',beach:'The Sea Seeker',luxury:'The Golden Traveler',budget:'The Clever Explorer'}[top]):'Your story is still unfolding'};
 const selected=s.selectedExperiences.map(byId);s.estimatedPrice={knownSubtotal:selected.reduce((n,x)=>n+(x.price??0),0)*(s.travelDetails.travelers||1),hasUnknown:selected.some(x=>x.price===null),travelers:s.travelDetails.travelers||1,currency:'USD',basis:'Original prototype sample experience prices; excludes accommodation, flights and transfers'};return s;}
export function hydrate(raw){const s=fresh();if(!raw||raw.version!==2)return derive(s);s.traveler.name=typeof raw.traveler?.name==='string'?raw.traveler.name.slice(0,40):'';
 for(const k of Object.keys(s.preferences))s.preferences[k]=Math.max(0,Math.min(100,Number(raw.preferences?.[k])||0));
 for(const k of ['selectedExperiences','suggestedExperiences','excludedExperiences','unlockedContent'])s[k]=Array.isArray(raw[k])?raw[k].filter(id=>byId(id)):[];
 s.selectedExperiences=s.selectedExperiences.filter(id=>!s.excludedExperiences.includes(id));s.destinations=Array.isArray(raw.destinations)?raw.destinations.filter(x=>cities.includes(x)):[];
 for(const k of Object.keys(s.travelStyle))if(['slow','balanced','fast','simple','comfortable','luxury','light','full'].includes(raw.travelStyle?.[k]))s.travelStyle[k]=raw.travelStyle[k];
 for(const k of ['duration','travelers']){const n=Number(raw.travelDetails?.[k]);if(Number.isInteger(n)&&n>=1&&n<=(k==='duration'?30:20))s.travelDetails[k]=n;}
 if(/^\d{4}-\d{2}-\d{2}$/.test(raw.travelDetails?.travelDate))s.travelDetails.travelDate=raw.travelDetails.travelDate;
 s.started=!!raw.started;s.gameHistory=Array.isArray(raw.gameHistory)?raw.gameHistory.filter(x=>x&&['archaeologist','choice','navigator','anubis'].includes(x.game)&&Array.isArray(x.actions)&&Array.isArray(x.effects)).slice(-250):[];s.games=raw.games&&typeof raw.games==='object'?raw.games:{};s.activeGame=['archaeologist','choice','navigator','anubis'].includes(raw.activeGame)?raw.activeGame:s.activeGame;return derive(s);}
export function migrate(old){let s=fresh();s.traveler.name=typeof old?.name==='string'?old.name.slice(0,40):'';const mapping={2:['pyramids','kings','karnak'],3:['cruise','sail',null],4:[null,'desert',null],5:['food',null,null]};for(const [i,ids] of Object.entries(mapping)){const cell=old?.c?.[i];if(cell?.w==='u'&&ids[cell.o])s=applyTripEffects(s,[{type:'select_experience',experienceId:ids[cell.o]}]);}return derive(s);}
