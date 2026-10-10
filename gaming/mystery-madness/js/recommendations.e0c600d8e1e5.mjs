const VALID_MODES=['experimental','verified'];
export function usablePower(power,heroId,mode='verified') {
 if(!VALID_MODES.includes(mode))throw Error('Unknown evidence mode.');
 if(!power||!power.eligibleHeroIds?.includes(heroId)||power.availability==='disabled')return false;
 if(mode==='experimental')return power.eligibilityStatus!=='unverified';
 return power.eligibilityStatus==='verified'&&power.fieldVerification?.description==='verified'&&power.availability==='available';
}
export function availableBlueprints(blueprints,powers,heroId,mode='verified') {
 const map=new Map(powers.map(p=>[p.id,p]));
 return blueprints.filter(b=>b.heroId===heroId&&(mode==='experimental'||b.verificationStatus==='verified')&&b.steps.every(s=>usablePower(map.get(s.powerId),heroId,mode)));
}
export function analyzeBuild({blueprint,powers,selectedIds,rules=[],mode='verified'}) {
 if(!VALID_MODES.includes(mode))throw Error('Unknown evidence mode.');
 const map=new Map(powers.map(p=>[p.id,p]));
 const selected=[...new Set(selectedIds)].filter(id=>usablePower(map.get(id),blueprint.heroId,mode));
 const ids=new Set(selected),dimensions={damage:0,survivability:0,mobility:0,ability:0,reliability:0};
 const matches=[],conditions=[],permanent=[];
 let earned=0;const possible=blueprint.steps.reduce((n,s)=>n+s.weight,0);
 for(const step of blueprint.steps){
  const options=[{powerId:step.powerId,credit:1,reason:step.reason,condition:step.condition,dimensions:step.dimensions},...step.alternatives];
  const eligible=options.filter(o=>ids.has(o.powerId)).sort((a,b)=>b.credit-a.credit||a.powerId.localeCompare(b.powerId));
  const match=eligible[0];
  if(match){earned+=step.weight*match.credit;matches.push({step:step.label,powerId:match.powerId,points:step.weight*match.credit,reason:match.reason});
   for(const [d,v] of Object.entries(match.dimensions||{}))dimensions[d]+=v;
   if(match.condition)conditions.push({powerId:match.powerId,text:match.condition});else permanent.push({powerId:match.powerId,text:'No trigger is stated in this transcription; permanence is not verified.'});
  }
 }
 const interactions=rules.filter(r=>r.heroId===blueprint.heroId&&(!r.blueprintId||r.blueprintId===blueprint.id)&&(mode==='experimental'||r.verificationStatus==='verified')&&r.requiredPowerIds.every(id=>ids.has(id))).sort((a,b)=>a.id.localeCompare(b.id));
 const adjustment=interactions.reduce((n,r)=>n+r.weight,0);
 const score=possible?Math.max(0,Math.min(100,Math.round(100*(earned+adjustment)/possible))):0;
 const relevant=new Set(blueprint.steps.flatMap(s=>[s.powerId,...s.alternatives.map(a=>a.powerId)]));
 return {score,earned,possible,adjustment,matches,interactions,conditions,permanent,dimensions,unmatched:selected.filter(id=>!relevant.has(id)),rejected:[...new Set(selectedIds)].filter(id=>!ids.has(id)),confidence:mode==='experimental'?'Editorial suggestion: source descriptions and eligibility are not independently verified.':'Verified data only.',explanation:'Fit measures weighted archetype targets covered, plus disclosed editorial interaction weights. It is not win rate, damage, rarity probability or statistical optimization.'};
}
export function rankedFallbacks({blueprint,powers,selectedIds,mode='verified'}) {
 const map=new Map(powers.map(p=>[p.id,p])),selected=new Set(selectedIds),result=[];
 for(const step of blueprint.steps){
  if(selected.has(step.powerId)||step.alternatives.some(a=>selected.has(a.powerId)))continue;
  for(const a of step.alternatives){if(!selected.has(a.powerId)&&usablePower(map.get(a.powerId),blueprint.heroId,mode))result.push({...a,forPowerId:step.powerId,step:step.label,rank:step.weight*a.credit});}
 }
 return result.sort((a,b)=>b.rank-a.rank||a.powerId.localeCompare(b.powerId));
}
export function validateRecommendations(bundle,data) {
 if(!bundle||bundle.schemaVersion!==1||typeof bundle.rulesVersion!=='string'||!Array.isArray(bundle.blueprints)||!Array.isArray(bundle.rules))throw Error('Invalid recommendation bundle.');
 const heroIds=new Set(data.heroes.map(h=>h.id)),powers=new Map(data.powers.map(p=>[p.id,p])),ids=new Set();
 const checkReference=(id,hero)=>{if(!powers.get(id)?.eligibleHeroIds?.includes(hero))throw Error('Unassociated recommendation power '+id);};
 const checkDimensions=d=>{if(!d||typeof d!=='object'||Object.entries(d).some(([k,v])=>!['damage','survivability','mobility','ability','reliability'].includes(k)||!Number.isFinite(v)||v<0||v>5))throw Error('Invalid editorial dimensions.');};
 for(const b of bundle.blueprints){
  if(typeof b.id!=='string'||!b.id||ids.has(b.id)||!heroIds.has(b.heroId)||!['verified','partially_verified','unverified'].includes(b.verificationStatus))throw Error('Invalid blueprint.');ids.add(b.id);
  if(b.category!==undefined&&!['big-dps','tanky','spooky','support'].includes(b.category))throw Error('Invalid path category.');
  for(const key of ['name','archetype','strategy','winCondition','why','limitations'])if(typeof b[key]!=='string'||!b[key])throw Error('Missing blueprint '+key);
  if(!Array.isArray(b.steps)||!b.steps.length)throw Error('Blueprint needs steps.');
  if(b.planningSlots!==undefined&&(!Number.isInteger(b.planningSlots)||b.planningSlots!==b.steps.length))throw Error('Invalid planning slots.');
  if(b.optionalLegendary){checkReference(b.optionalLegendary.powerId,b.heroId);const extra=powers.get(b.optionalLegendary.powerId);if(extra.rarity!=='Legendary'||extra.availability==='disabled'||!b.optionalLegendary.reason||b.steps.some(s=>s.powerId===extra.id))throw Error('Invalid optional Legendary.');}
  const unique=new Set();
  for(const s of b.steps){
   checkReference(s.powerId,b.heroId);if(unique.has(s.powerId)||!Number.isFinite(s.weight)||s.weight<=0||s.weight>100||!s.label||!s.reason||!Array.isArray(s.alternatives))throw Error('Invalid target step.');unique.add(s.powerId);checkDimensions(s.dimensions);
   for(const a of s.alternatives){checkReference(a.powerId,b.heroId);if(!Number.isFinite(a.credit)||a.credit<=0||a.credit>=1||!a.reason)throw Error('Invalid fallback.');checkDimensions(a.dimensions);}
  }
 }
 const ruleIds=new Set();
 for(const r of bundle.rules){if(!r.id||ruleIds.has(r.id)||!heroIds.has(r.heroId)||!['synergy','conflict','conditional','diminishing'].includes(r.type)||!Number.isFinite(r.weight)||Math.abs(r.weight)>25||!r.explanation||!r.rationale||!['verified','partially_verified','unverified'].includes(r.verificationStatus)||!Array.isArray(r.requiredPowerIds)||r.requiredPowerIds.length<2||r.blueprintId&&!ids.has(r.blueprintId))throw Error('Invalid interaction rule.');ruleIds.add(r.id);r.requiredPowerIds.forEach(id=>checkReference(id,r.heroId));}
 return bundle;
}
export async function loadRecommendations(data,fetcher=fetch) {
 const get=async path=>{const response=await fetcher(path);if(!response.ok)throw Error('Cannot load '+path);return response.json();};
 const manifest=await get('data/recommendations-manifest.json');
 if(manifest.schemaVersion!==1||typeof manifest.rulesVersion!=='string')throw Error('Unsupported recommendations version.');
 for(const key of ['archetypes','synergies'])if(!/^\.\/[a-z0-9.-]+\.json$/.test(manifest.files?.[key]||''))throw Error('Invalid recommendation path.');
 const [a,s]=await Promise.all(['archetypes','synergies'].map(k=>get('data/'+manifest.files[k].slice(2))));
 for(const e of [a,s])if(e.schemaVersion!==1||e.rulesVersion!==manifest.rulesVersion||!Array.isArray(e.records))throw Error('Recommendation versions do not match.');
 return validateRecommendations({...manifest,blueprints:a.records,rules:s.records},data);
}

// Custom analysis never changes selections. Shared ability references are clues,
// and stay distinct from independently reviewed interaction rules.
export function adventureInsights({powers,heroId,selectedIds,rules=[],blueprints=[],mode='experimental'}){
 const chosen=powers.filter(p=>selectedIds.includes(p.id)&&usablePower(p,heroId,mode));
 const ids=new Set(chosen.map(p=>p.id));
 const interactions=rules.filter(r=>r.heroId===heroId&&(mode==='experimental'||r.verificationStatus==='verified')&&r.requiredPowerIds.every(id=>ids.has(id)));
 const overlaps=[];
 for(let i=0;i<chosen.length;i++)for(const b of chosen.slice(i+1)){
  const a=chosen[i],shared=(a.provenance?.abilityReferences||[]).map(r=>r.name).filter(name=>(b.provenance?.abilityReferences||[]).some(r=>r.name===name));
  if(shared.length)overlaps.push({powerIds:[a.id,b.id],text:`${a.name} + ${b.name}: both affect ${[...new Set(shared)].join(', ')}. Possible combination; effect stacking is untested.`});
 }
 const fits=availableBlueprints(blueprints,powers,heroId,mode).filter(b=>b.category).map(b=>({blueprint:b,fit:evaluateArchetype({blueprint:b,powers,selectedIds,rules,mode})})).sort((a,b)=>b.fit.score-a.fit.score||a.blueprint.id.localeCompare(b.blueprint.id));
 const strongest=fits[0];
 const suggestion=chosen.length&&strongest?.fit.score>0?strongest.blueprint.steps.find(s=>!ids.has(s.powerId)&&!s.alternatives.some(a=>ids.has(a.powerId))):null;
 return {interactions,overlaps,strongest:chosen.length?strongest:null,suggestion};
}

// Explicit editorial text rules, not a DPS simulation or inferred stacking bonus.
const COMPATIBILITY={
 'big-dps':{direct:/damage|critical|bleed|burn|explosion/i,enabling:/ammo|fire rate|attack speed|projectile|cooldown/i},
 tanky:{direct:/overhealth|armor|damage reduction|shield|maximum life|lifesteal/i,enabling:/heal|recover|cleanse|duration/i},
 support:{direct:/ally|allies|teammate/i,enabling:/heal|protection|shield|overhealth|pack/i},
 spooky:{direct:/transform|zomnic|summon|resurrect|clone|soul|gravity|teleport/i,enabling:/bleed|launch|flight|fly|shroud|burn/i}
};
export function evaluateArchetype({blueprint,powers,selectedIds,rules=[],mode='verified'}){
 const coverage=analyzeBuild({blueprint,powers,selectedIds,rules,mode});

 const map=new Map(powers.map(p=>[p.id,p])),ids=[...new Set(selectedIds)].filter(id=>usablePower(map.get(id),blueprint.heroId,mode));
 const category=blueprint.category||(/heal|support/i.test(blueprint.archetype)?'support':/surviv|tank/i.test(blueprint.archetype)?'tanky':/chaos|spooky/i.test(blueprint.archetype)?'spooky':'big-dps');const signal=COMPATIBILITY[category];
 const compatibility=ids.map(id=>{const p=map.get(id),direct=signal.direct.test(p.description||''),enabling=signal.enabling.test(p.description||'');return {powerId:id,value:direct?(enabling?1:.75):(enabling?.5:0),reason:direct?(enabling?'Direct role effect and enabling effect':'Direct role effect'):enabling?'Enabling effect only':'No role signal matched in the source description'};});
 const average=compatibility.length?compatibility.reduce((n,p)=>n+p.value,0)/compatibility.length:0;
 const targetPoints=50*coverage.earned/coverage.possible,compatibilityPoints=35*average;
 // Only explicit interaction records contribute: shared ability names alone do not.
 const interactionPoints=Math.max(-15,Math.min(15,coverage.adjustment));
 return {...coverage,score:Math.max(0,Math.min(100,Math.round(targetPoints+compatibilityPoints+interactionPoints))),started:ids.length>0,coverage,compatibility,compatibilityRule:{direct:signal.direct.source,enabling:signal.enabling.source},targetPoints,compatibilityPoints,interactionPoints};
}

const recommendationCache=new WeakMap();
export function bestRecommendation({blueprint,powers,rules=[],mode='verified',horizon=blueprint.steps.length}){
 let cache=recommendationCache.get(blueprint);if(!cache){cache=new Map();recommendationCache.set(blueprint,cache);}
 const key=mode+'|'+horizon+'|'+JSON.stringify(powers.map(p=>[p.id,p.eligibilityStatus,p.availability,p.description,p.fieldVerification]))+'|'+JSON.stringify(rules);
 if(cache.has(key))return cache.get(key);
 const map=new Map(powers.map(p=>[p.id,p]));
 const choices=blueprint.steps.map(s=>[s.powerId,...s.alternatives.map(a=>a.powerId)].filter(id=>usablePower(map.get(id),blueprint.heroId,mode)));
 if(choices.some(c=>!c.length))return null;
 let best=null,evaluated=0;
 function visit(ids,index){if(index===choices.length){const fit=evaluateArchetype({blueprint,powers,selectedIds:ids.slice(0,horizon),rules,mode});evaluated++;if(!best||fit.score>best.fit.score)best={ids:[...ids],fit};return;}for(const id of choices[index])if(!ids.includes(id))visit([...ids,id],index+1);}
 visit([],0);if(best)best.evaluated=evaluated;cache.set(key,best);return best;
}

export function archetypeRelevant(power,blueprint,powers,mode='experimental'){
 if(!blueprint?.category)return true;
 // Shared Common stat powers remain available in every playstyle; eligibility
 // and evidence requirements are enforced separately by each caller.
 if(power.rarity==='Common'&&power.provenance?.section==='General Powers')return true;
 if(blueprint.steps.some(s=>s.powerId===power.id||s.alternatives.some(a=>a.powerId===power.id)))return true;
 return evaluateArchetype({blueprint,powers,selectedIds:[power.id],rules:[],mode}).compatibilityPoints>0;
}
