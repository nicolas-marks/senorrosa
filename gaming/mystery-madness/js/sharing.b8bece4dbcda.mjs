import {HERO_IDS} from './data.b841fb814941.mjs';
const MODES=['experimental','verified'];
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
export function validateBuild(input,powers,heroes,{blueprints=[]}={}) {
 if(!object(input))throw Error('Build must be an object.');
 if(input.version!==undefined&&![1,2].includes(input.version))throw Error('Unsupported build version.');
 const warnings=[];
 const rawHero=input.version===2?Object.keys(HERO_IDS).find(name=>HERO_IDS[name]===input.heroId):input.hero;
 const hero=typeof rawHero==='string'&&(rawHero==='All'||heroes.includes(rawHero))?rawHero:'All';
 if(hero!==rawHero)warnings.push('Unknown hero; choose a hero to continue.');
 if(!Array.isArray(input.selected)||input.selected.length>1000||input.selected.some(id=>typeof id!=='string'||id.length>200))throw Error('Invalid selected power IDs.');
 const selected=[...new Set(input.selected)].filter(id=>{const p=powers.find(p=>p.id===id);const ok=p&&hero!=='All'&&p.hero.split(';').includes(hero)&&p.eligibilityStatus!=='unverified'&&p.normalized?.availability!=='disabled';if(!ok)warnings.push('Removed unknown or incompatible power: '+id.slice(0,80));return ok;});
 if(input.name!==undefined&&typeof input.name!=='string')throw Error('Invalid build name.');
 const name=(input.name||'Untitled Madness Build').slice(0,120);
 if(input.config!==undefined&&!object(input.config))throw Error('Invalid build configuration.');
 const raw=input.config||{};
 const evidenceMode=MODES.includes(raw.evidenceMode)?raw.evidenceMode:'experimental';
 if(raw.evidenceMode!==undefined&&!MODES.includes(raw.evidenceMode))warnings.push('Unknown evidence mode; restored as an experimental wish list.');
 const config={evidenceMode,dataVersion:typeof raw.dataVersion==='string'?raw.dataVersion.slice(0,80):null,rulesVersion:typeof raw.rulesVersion==='string'?raw.rulesVersion.slice(0,80):null,importedCatalog:raw.importedCatalog===true};
 if(raw.match!==undefined){
  if(!object(raw.match))throw Error('Invalid match configuration.');
  const bounds={minutes:[1,60],elapsed:[0,60],activeFraction:[.1,1],eventsPerMinute:[0,30],xpPerEvent:[3,5],growth:[0,200],usefulChoiceFraction:[0,1]};
  config.match={};for(const [key,[min,max]] of Object.entries(bounds)){const value=raw.match[key];if(value!==undefined){if(!Number.isFinite(value)||value<min||value>max)throw Error('Invalid match configuration: '+key);config.match[key]=value;}}
  if(raw.match.planningLevel!==undefined){if(!Number.isInteger(raw.match.planningLevel)||raw.match.planningLevel<1||raw.match.planningLevel>8)throw Error('Invalid planning level.');config.match.planningLevel=raw.match.planningLevel;}config.match.randomHero=raw.match.randomHero===true;
 }
 let archetypeId='';
 if(typeof input.archetypeId==='string'&&input.archetypeId){const blueprint=blueprints.find(b=>b.id===input.archetypeId&&b.heroId===HERO_IDS[hero]);if(blueprint&&(evidenceMode==='experimental'||blueprint.verificationStatus==='verified'))archetypeId=blueprint.id;else warnings.push('Unknown, incompatible or unverified build direction; retained custom powers.');}
 if(raw.plannedOverrides!==undefined){
  if(!object(raw.plannedOverrides)||Object.keys(raw.plannedOverrides).length>100)throw Error('Invalid planned blueprints.');config.plannedOverrides={};
  for(const [id,ids] of Object.entries(raw.plannedOverrides)){const b=blueprints.find(b=>b.id===id&&b.heroId===HERO_IDS[hero]);if(!b){warnings.push('Removed incompatible planned blueprint.');continue;}if(!Array.isArray(ids)||ids.length!==b.steps.length||ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length)throw Error('Invalid planned power slots.');const valid=ids.every(id=>{const p=powers.find(p=>p.id===id);return p?.hero.split(';').includes(hero)&&p.eligibilityStatus!=='unverified'&&p.normalized?.availability!=='disabled'&&(evidenceMode!=='verified'||p.normalized?.eligibilityStatus==='verified'&&p.normalized?.fieldVerification?.description==='verified'&&p.normalized?.availability==='available');});if(valid)config.plannedOverrides[id]=ids;else warnings.push('Removed ineligible planned powers.');}
 }
 return {build:{version:2,hero,heroId:HERO_IDS[hero]||null,selected,name,archetypeId,config},warnings};
}
function encodeUTF8(text){const bytes=new TextEncoder().encode(text);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
function decodeUTF8(value){if(!/^[A-Za-z0-9_-]+$/.test(value)||value.length%4===1)throw Error('Invalid compact link encoding.');const binary=atob(value.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-value.length%4)%4));return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(binary,c=>c.charCodeAt(0)));}
export function decodeBuild(hash) {
 if(typeof hash!=='string'||hash.length>32000)throw Error('Build link is too long.');
 const params=new URLSearchParams(hash.replace(/^#/,''));
 if(params.has('b')){
  const compact=JSON.parse(decodeUTF8(params.get('b')));
  if(!object(compact)||compact.v!==2)throw Error('Unsupported compact build version.');
  if(!Array.isArray(compact.p)||typeof compact.h!=='string'||typeof compact.n!=='string'||typeof compact.a!=='string'||!object(compact.c))throw Error('Invalid compact build values.');
  return {version:2,heroId:compact.h,selected:compact.p,name:compact.n,archetypeId:compact.a,config:compact.c};
 }
 if(!params.has('build'))return null;
 const value=JSON.parse(params.get('build'));
 if(!object(value))throw Error('Build link must contain an object.');return value;
}
export function encodeBuild(build,url) {
 const h=build.heroId||HERO_IDS[build.hero];if(!h)throw Error('Choose a hero before sharing a build.');
 const compact={v:2,h,a:build.archetypeId||'',p:[...new Set(build.selected)],n:build.name||'Untitled Madness Build',c:build.config||{evidenceMode:'experimental'}};
 const link=url.split('#')[0]+'#b='+encodeUTF8(JSON.stringify(compact));if(link.length>32000)throw Error('Build is too large to share as a link.');return link;
}
export function readStored(storage){try{return {value:JSON.parse(storage.getItem('graveyard-build')||'null'),error:null};}catch{return {value:null,error:'Local saving is unavailable or the saved build is invalid.'};}}
export function writeStored(storage,build){try{storage.setItem('graveyard-build',JSON.stringify(build));return null;}catch{return 'Local saving is unavailable. You can still copy a build link.';}}
export function readLibrary(storage){
 try{const text=storage.getItem('graveyard-builds-v2');if(!text)return {records:[],error:null};const value=JSON.parse(text);if(!object(value)||value.version!==1||!Array.isArray(value.records)||value.records.length>1000)throw Error();return {records:value.records.filter(r=>object(r)&&typeof r.id==='string'&&typeof r.savedAt==='string'&&object(r.build)),error:null};}catch{return {records:[],error:'Saved build library is unavailable or invalid. Existing stored data has not been changed.'};}
}
export function saveLibraryBuild(storage,build,{id=null,now=new Date().toISOString()}={}){
 const library=readLibrary(storage);if(library.error)return {records:[],id:null,error:library.error};
 const recordId=id||('build-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10));
 const records=library.records.filter(r=>r.id!==recordId);records.unshift({id:recordId,savedAt:now,build});
 if(records.length>1000)return {records:library.records,id:null,error:'Saved library is too large; export your builds before saving more.'};
 try{storage.setItem('graveyard-builds-v2',JSON.stringify({version:1,records}));return {records,id:recordId,error:null};}catch{return {records:library.records,id:null,error:'Could not save this build locally. Copy a share link instead.'};}
}
