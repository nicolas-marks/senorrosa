import {renderSelectionPlanner} from './ui/selection-planner.9af21689ae91.mjs';
import {powerLabel,heroIcon,powerIcon,abilityIcon} from './ui/icons.fc9f2b44a4f9.mjs';
import {projectMatch,talentsAtPace} from './match-model.fe4a775f0f04.mjs';
import {renderHeroGallery} from './ui/explorer.deaef001f950.mjs';
import {createPowerCard} from './ui/power-card.55befceba8a8.mjs';
import {renderBuildExplorer} from './ui/tree-explorer.cd6d673a6236.mjs';
import {renderMatchPlanner} from './ui/match-planner.c12303fdc429.mjs';
import {loadRecommendations,availableBlueprints,adventureInsights,archetypeRelevant,usablePower} from './recommendations.e0c600d8e1e5.mjs';
import {parseCSV,toCSV,normalizePower,loadDataset} from './data.b841fb814941.mjs';
import {validateBuild,decodeBuild,encodeBuild,readStored,writeStored,readLibrary,saveLibraryBuild} from './state.479bd29c6aba.mjs';
let dataset=null;
let recommendations=null,blueprintId='',evidenceMode='experimental',importedCatalog=false;
let activeSavedId=null,plannedOverrides={},customizing=false;
const notify=message=>{document.getElementById('status').textContent=message;};

const $=id=>document.getElementById(id);

let powers=[],selected=[],talentPlan=[],hero='All';
const GENERIC_TAGS=new Set(['damage','mobility','healing','critical','cooldown','ultimate','overhealth','health','lifesteal','eliminations','armor','support','radius','ammo','movement','move speed','attack speed']);

function heroes(){return dataset?dataset.heroes.map(h=>h.name).sort():[]}
function heroListForPower(p){return (p.hero||'All').split(';').map(x=>x.trim())}
function powerVisibleForHero(p,h){return h==='All'||(p.eligibilityStatus!=='unverified'&&heroListForPower(p).includes(h))}
function applyNormalized(records){
 powers=records.map(p=>({...p.provenance.legacy,hero:p.eligibleHeroIds?.map(id=>dataset.heroes.find(h=>h.id===id).name).join(';')||'Unknown eligibility',normalized:p,eligibilityStatus:p.eligibilityStatus}));
 $('hero').replaceChildren();let all=document.createElement('option');all.value='All';all.textContent='Browse all heroes';$('hero').append(all);
 heroes().forEach(h=>{let o=document.createElement('option');o.value=h;o.textContent=h;$('hero').append(o)});
 $('hero').value=heroes().includes(hero)?hero:'All';hero=$('hero').value;
 const cleaned=validateBuild({hero,selected,name:$('buildName').value},powers,heroes()); selected=cleaned.build.selected;
 render();return cleaned.warnings;
}
function load(rows){if(!rows.length)throw Error('CSV has no powers.');importedCatalog=true;blueprintId='';const warnings=applyNormalized(rows.map(p=>normalizePower(p)));refreshPowerFilters();refreshDirections();$('dataVersion').textContent='Imported CSV · memory only · unreviewed evidence';$('coverage').textContent=dataset.heroes.map(h=>`${h.name}: ${powers.filter(p=>heroListForPower(p).includes(h.name)).length} imported associations; coverage incomplete`).join(' · ');return warnings;}
function getVisible(){let q=$('search').value.toLowerCase(),r=$('rarity').value,a=$('abilityFilter').value||'All',t=$('tagFilter').value||'All';return powers.filter(p=>powerVisibleForHero(p,hero)&&(r==='All'||p.rarity===r)&&(a==='All'||p.description.includes('['+a+']'))&&(t==='All'||p.tags.split(';').includes(t))&&[p.name,p.description,p.tags].some(v=>(v||'').toLowerCase().includes(q)))}
function refreshPowerFilters(){
 const catalog=powers.filter(p=>powerVisibleForHero(p,hero));
 for(const [id,label,values] of [['abilityFilter','All ability mentions',[...new Set(catalog.flatMap(p=>[...p.description.matchAll(/\[([^\]]+)\]/g)].map(m=>m[1])))].sort()],['tagFilter','All themes',[...new Set(catalog.flatMap(p=>p.tags.split(';')))].sort()]]){
  const control=$(id);control.replaceChildren();for(const value of ['All',...values]){const option=document.createElement('option');option.value=value;option.textContent=value==='All'?label:value;control.append(option);}control.value='All';
 }
}
function refreshDirections(){
 const control=$('archetype');control.replaceChildren();const custom=document.createElement('option');custom.value='';custom.textContent='Your Adventure - custom build';control.append(custom);
 const h=dataset?.heroes.find(h=>h.name===hero);const choices=importedCatalog?[]:availableBlueprints(recommendations?.blueprints||[],powers.map(p=>p.normalized),h?.id,evidenceMode).filter(b=>b.category||b.id===blueprintId);
 for(const b of choices){const option=document.createElement('option');option.value=b.id;option.textContent=b.name+' · '+b.archetype;control.append(option);}
 if(!choices.some(b=>b.id===blueprintId))blueprintId='';control.value=blueprintId;
}
function getSelectedPowers(){return selected.map(id=>powers.find(x=>x.id===id)).filter(Boolean)}
function computeProfile(chosen){
  const score={Damage:0,Healing:0,Mobility:0,Survival:0,Utility:0};
  chosen.forEach(p=>{
    const t=(p.tags||'').toLowerCase(); const d=(p.description||'').toLowerCase();
    if(/damage|critical|radius|helix rocket|shuriken|kunai|blizzard|swift strike/.test(t+' '+d)) score.Damage++;
    if(/healing|heals|healing ofuda|biotic field|support/.test(t+' '+d)) score.Healing++;
    if(/mobility|sprint|wall climb|double jump|move speed|swift strike/.test(t+' '+d)) score.Mobility++;
    if(/health|overhealth|armor|lifesteal|max life|surviv/.test(t+' '+d)) score.Survival++;
    if(/cooldown|ultimate|reveal|summon|utility|target/.test(t+' '+d)) score.Utility++;
  });
  const max=Math.max(1,...Object.values(score));
  return Object.entries(score).map(([k,v])=>({label:k,value:v,pct:Math.round(v/max*100)}));
}
function affectedAbilityTags(chosen){
  const raw=new Map();
  chosen.forEach(p=> (p.tags||'').split(';').map(x=>x.trim()).filter(Boolean).forEach(t=> raw.set(t,(raw.get(t)||0)+1)) );
  return [...raw.entries()].filter(([t])=>!GENERIC_TAGS.has(t.toLowerCase())).sort((a,b)=>b[1]-a[1]).slice(0,10);
}
function renderRoster(){
 if(!dataset)return;
 const count=renderHeroGallery($('roster'),dataset.heroes,{query:$('heroSearch').value,role:$('roleFilter').value||'All',selected:hero,powers,onSelect:changeHero});
 $('heroResults').textContent=`${count} of ${dataset.heroes.length} cataloged heroes`;
}
function renderHeroCard(chosen){
 $('workshop').hidden=hero==='All';$('buildExplorer').hidden=hero==='All';$('chaosArea').hidden=hero==='All';$('startHint').hidden=hero!=='All';
 $('heroCard').replaceChildren();$('heroCard').hidden=!!blueprintId;if(hero==='All')return;
 const record=dataset.heroes.find(h=>h.name===hero);
 $('workshopTitle').textContent=hero+' · Custom build';
 const cascade=document.createElement('ol');cascade.className='mini-cascade build-cascade';
 for(const p of chosen){const item=document.createElement('li');item.className='mini-choice picked';item.append(powerLabel(p.normalized));item.title=p.description;cascade.append(item);}
 if(!chosen.length){const empty=document.createElement('span');empty.className='subtle';empty.textContent='Select powers you actually choose in-game. Recommendations remain separate.';$('heroCard').append(empty);}else $('heroCard').append(cascade);
 $('heroConfidence').textContent=dataset.catalogSource==='saved-community-wiki'?`${record.wikiSpecificPowerCount} hero-specific powers in the saved wiki, plus shared general powers. ${record.availability==='announced'?'Upcoming section; current unlock not confirmed.':'Listed in the saved wiki roster.'} Community evidence; catalog completeness and current hotfixes remain unconfirmed.`:'Legacy evidence; catalog completeness and current availability remain unconfirmed.';
}
function renderMetrics(chosen){
 $('metrics').replaceChildren();
 const card=document.createElement('div');card.className='metric-card';
 const title=document.createElement('div');title.className='k';title.textContent='Effect totals';
 const detail=document.createElement('div');detail.className='s';detail.textContent='Unverified. Read individual descriptions for targets, conditions, durations and caps; bonuses are not summed.';
 card.append(title,detail);$('metrics').append(card);
}
function renderProfile(chosen){ $('profileBars').replaceChildren(); computeProfile(chosen).forEach(item=>{ const row=document.createElement('div'); row.className='bar-row'; row.innerHTML=`<div class="subtle">${item.label}</div><div class="bar"><span style="width:${item.pct}%"></span></div><div class="subtle" style="text-align:right">${item.value}</div>`; $('profileBars').append(row); }); }
function renderAbilityFocus(chosen){ $('abilityFocus').replaceChildren(); const tags=affectedAbilityTags(chosen); if(!tags.length){ $('abilityFocus').innerHTML='<span class="ability-chip">No hero-specific focus yet</span>'; return; } tags.forEach(([t,n])=>{ const chip=document.createElement('span'); chip.className='tag-chip'+(n>=2?' hot':''); chip.append(abilityIcon(t));const label=document.createElement('span');label.textContent=t+(n>=2?` ×${n}`:''); $('abilityFocus').append(chip); }); }
function render(){
  renderRoster();
  $('share').disabled=hero==='All';$('saveBuild').disabled=hero==='All';$('duplicate').disabled=hero==='All';
  const list=hero==='All'?[]:getVisible(); $('count').textContent=`(${list.length})`; $('cards').replaceChildren();
  if(!list.length){const message=document.createElement('p');message.className='empty';message.textContent=hero==='All'?'Choose a hero to explore powers.':powers.some(p=>powerVisibleForHero(p,hero))?'No powers match. Clear search or choose another rarity.':'No power cards have been documented for this hero yet. Try another hero while the catalog is being verified.';$('cards').append(message);}
  list.forEach(p=>$('cards').append(createPowerCard(p,{selected:selected.includes(p.id),eligible:powerVisibleForHero(p,hero),onToggle:toggle,image:p.normalized.image})));
  $('selectedCount').textContent=selected.length; $('currentHero').textContent=(hero==='All'?'Any hero':hero)+' · Theorycrafting'; $('slots').replaceChildren();
  if(!selected.length){let p=document.createElement('p'); p.className='muted'; p.textContent='Select a power card to start building.'; $('slots').append(p)}
  selected.forEach(id=>{ let p=powers.find(p=>p.id===id); if(!p)return; let box=document.createElement('div'); box.className='slot'; let title=document.createElement('span'); title.textContent=p.name+' · '+p.rarity; let b=document.createElement('button'); b.textContent='✕'; b.title='Remove power';b.setAttribute('aria-label','Remove '+p.name); b.onclick=()=>toggle(id); box.append(title,b); $('slots').append(box)});

  const chosen=getSelectedPowers();
  renderHeroCard(chosen); renderMetrics(chosen); renderProfile(chosen); renderAbilityFocus(chosen);
  if(!$('progression').matchLive)renderMatchPlanner($('progression'),{heroId:dataset?.heroes.find(h=>h.name===hero)?.id,bundle:importedCatalog?null:recommendations,powers:powers.map(p=>p.normalized),selectedIds:selected.slice(0,projectMatch($('progression').matchState||{}).level),onPreview:previewBlueprint,onChange:updateMatchTalents,mode:evidenceMode});
  renderBuildExplorer({container:$('buildExplorer'),analysisContainer:$('buildAnalysis'),data:{...dataset,powers:powers.map(p=>p.normalized)},bundle:importedCatalog?null:recommendations,heroId:dataset?.heroes.find(h=>h.name===hero)?.id,mode:evidenceMode,blueprintId,selectedIds:selected,onUse:useBlueprint,onPreview:previewBlueprint,onFallback:toggle,plannedIds:plannedOverrides[blueprintId],customizing,onCustomize:()=>{customizing=!customizing;render();},onSwap:swapPlanned,onReset:resetRecommended,projection:projectMatch($('progression').matchState||{})});

  renderSelectionPlanner({heroRecord:dataset?.heroes.find(h=>h.name===hero),idealSummary:$('idealHeroSummary'),mySummary:$('myHeroSummary'),idealContainer:$('perfectBlueprintFit'),myContainer:$('myBuildFit'),tableContainer:$('powerSelection'),heroId:dataset?.heroes.find(h=>h.name===hero)?.id,powers:powers.map(p=>p.normalized),bundle:importedCatalog?null:recommendations,blueprintId,selectedIds:selected,projection:projectMatch($('progression').matchState||{}),mode:evidenceMode,onToggle:toggle,onRecommended:populateRecommended,onClear:()=>{selected=[];render();save();}});
  $('synergies').replaceChildren();
  const insight=adventureInsights({powers:powers.map(p=>p.normalized),heroId:dataset?.heroes.find(h=>h.name===hero)?.id,selectedIds:selected.slice(0,projectMatch($('progression').matchState||{}).level),rules:recommendations?.rules||[],blueprints:recommendations?.blueprints||[],mode:evidenceMode});
  for(const item of [...insight.interactions.map(r=>`${r.verificationStatus}: ${r.explanation}`),...insight.overlaps.map(p=>p.text)]){const el=document.createElement('div');el.className='syn';for(const power of chosen.filter(p=>item.includes(p.name)))el.append(powerLabel(power.normalized));const text=document.createElement('span');text.textContent=item;el.append(text);$('synergies').append(el);}
  if(!$('synergies').children.length){const el=document.createElement('div');el.className='syn';el.textContent='No documented interaction or shared-ability combination identified. This does not establish that these powers cannot interact.';$('synergies').append(el);}

}
function updateMatchTalents({live=false}={}){
 // XP changes the recommendation horizon, never the player's selections.
 $('progression').matchLive=live;
 render();$('progression').matchLive=false;save();return selected.slice(0,projectMatch($('progression').matchState||{}).level);
}
function toggle(id){const p=powers.find(p=>p.id===id);if(!p||p.normalized.availability==='disabled'||hero==='All'||!powerVisibleForHero(p,hero)){notify('Choose an eligible hero before adding powers.');return;}const removing=selected.includes(id);const objective=recommendations?.blueprints.find(b=>b.id===blueprintId);if(!removing&&objective&&!archetypeRelevant(p.normalized,objective,powers.map(p=>p.normalized),evidenceMode)){notify('Choose a power relevant to this archetype, or use Your Adventure.');return;}if(!removing&&!usablePower(p.normalized,dataset.heroes.find(h=>h.name===hero)?.id,evidenceMode)){notify('This power does not meet the selected evidence requirements.');return;}if(!removing&&selected.length>=projectMatch($('progression').matchState||{}).level){notify('Selection capacity reached. Remove a stored power or increase projected level.');return;}selected=removing?selected.filter(x=>x!==id):[...selected,id];talentPlan=removing?talentPlan.filter(x=>x!==id):[...new Set([...talentPlan,id])];render();save();}
function build(){return {version:2,hero,heroId:dataset?.heroes.find(h=>h.name===hero)?.id||null,selected,name:$('buildName').value,archetypeId:blueprintId,config:{evidenceMode,dataVersion:importedCatalog?'imported-session':dataset?.dataVersion||null,rulesVersion:recommendations?.rulesVersion||null,importedCatalog,plannedOverrides,match:{...($('progression').matchState||projectMatch())}}};}
function checkedBuild(input){return validateBuild(input,powers,heroes(),{blueprints:recommendations?.blueprints||[]});}
function save(){let error;try{error=writeStored(localStorage,build());}catch{error='Local saving is unavailable. Copy a build link instead.';}if(error)notify(error);}
function applyBuild(input){
 const result=checkedBuild(input),restored=result.build;
 plannedOverrides=restored.config.plannedOverrides||{};customizing=false;$('progression').matchState={...(restored.config.match||{}),planningLevel:8};hero=restored.hero;selected=restored.selected;blueprintId=restored.archetypeId;const restoredRoute=recommendations?.blueprints.find(b=>b.id===blueprintId);talentPlan=restoredRoute?[...new Set([...restoredRoute.steps.map(s=>[s.powerId,...s.alternatives.map(a=>a.powerId)].find(id=>selected.includes(id))||s.powerId),...selected])]:[...selected];evidenceMode=restored.config.evidenceMode;
 $('hero').value=hero;$('evidenceMode').value=evidenceMode;$('buildName').value=restored.name;
 if(restored.config.importedCatalog){blueprintId='';result.warnings.push('Imported CSV catalog is not embedded in this build. Current descriptions are shown; import the same CSV to reproduce its data.');}
 if(restored.config.dataVersion&&restored.config.dataVersion!==dataset.dataVersion)result.warnings.push('Build data version differs; selections were checked against the current catalog.');
 if(restored.config.rulesVersion&&restored.config.rulesVersion!==recommendations?.rulesVersion)result.warnings.push('Rule version differs; current explanations apply.');
 refreshPowerFilters();refreshDirections();render();notify(result.warnings.length?result.warnings.join(' '):'Build restored.');
}
function restore(){
 let input;try{input=decodeBuild(location.hash);}catch{notify('Invalid build link; choose a hero to start a new build.');return;}
 if(!input){let saved;try{saved=readStored(localStorage);}catch{saved={value:null,error:'Local saving is unavailable.'};}if(saved.error)notify(saved.error);input=saved.value;if(input&&input.config?.match?.planningLevel===undefined)input={...input,selected:[]};}
 if(!input)return;
 try{applyBuild(input);}catch(e){notify('Could not restore build: '+e.message);}
}
function renderLibrary(){
 $('savedBuilds').replaceChildren();let library;try{library=readLibrary(localStorage);}catch{library={records:[],error:'Local saving is unavailable.'};}
 if(library.error){const p=document.createElement('p');p.className='subtle';p.textContent=library.error;$('savedBuilds').append(p);return;}
 if(!library.records.length){const p=document.createElement('p');p.className='subtle';p.textContent='Save a named build to keep it on this device. No account needed.';$('savedBuilds').append(p);return;}
 for(const record of library.records){const button=document.createElement('button');button.className='saved-build';button.type='button';const name=document.createElement('strong');name.textContent=typeof record.build.name==='string'?record.build.name:'Unnamed build';const meta=document.createElement('span');meta.className='subtle';const heroName=dataset.heroes.find(h=>h.id===record.build.heroId)?.name||record.build.hero||'Unknown hero';meta.textContent=heroName+' · saved '+record.savedAt.slice(0,10);button.append(heroIcon(record.build.heroId||dataset.heroes.find(h=>h.name===heroName)?.id),name,meta);button.onclick=()=>{try{applyBuild(record.build);activeSavedId=record.id;save();}catch(error){notify('Saved build could not be opened: '+error.message);}};$('savedBuilds').append(button);}
}
function saveNamed(){if(hero==='All'){notify('Choose a hero before saving a named build.');return;}let result;try{result=saveLibraryBuild(localStorage,build(),{id:activeSavedId});}catch{notify('Local saving is unavailable. Copy a build link instead.');return;}if(result.error){notify(result.error);return;}activeSavedId=result.id;renderLibrary();save();notify('Build saved on this device.');}
async function copyText(text,message){try{await navigator.clipboard.writeText(text);notify(message);}catch{const output=$('copyFallback');output.hidden=false;output.value=text;output.focus();output.select();notify('Clipboard unavailable. Copy the selected text below.');}}
function changeHero(value){$('rarity').value='All';$('search').value='';hero=value;selected=[];plannedOverrides={};customizing=false;talentPlan=[];blueprintId='';activeSavedId=null;$('hero').value=hero;const result=checkedBuild(build());selected=result.build.selected;refreshPowerFilters();refreshDirections();render();save();if(result.warnings.length)notify(result.warnings.join(' '));}
function previewBlueprint(id){if(id!==blueprintId)selected=[];customizing=false;if(id&&id!==blueprintId){$('buildExplorer').treeOpen=false;useBlueprint(id);return;}blueprintId=id;$('buildExplorer').treeOpen=!id;refreshDirections();render();save();}
function useBlueprint(id){const h=dataset.heroes.find(h=>h.name===hero);const b=availableBlueprints(recommendations?.blueprints||[],powers.map(p=>p.normalized),h?.id,evidenceMode).find(b=>b.id===id);if(!b||importedCatalog)return;activeSavedId=null;if(id!==blueprintId)selected=[];blueprintId=id;talentPlan=b.steps.map(s=>s.powerId);$('buildName').value=b.name;refreshDirections();render();save();notify('Recommended path ready. Mark powers you actually choose; match time only changes the plan.');}
$('heroSearch').oninput=renderRoster;$('roleFilter').onchange=renderRoster;
$('startCustom').onclick=()=>{selected=[];talentPlan=[];blueprintId='';activeSavedId=null;refreshDirections();$('buildName').value=hero+' experiment';render();save();notify('Started a fresh custom build.');};
$('saveBuild').onclick=saveNamed;
$('duplicate').onclick=()=>{activeSavedId=null;$('buildName').value=($('buildName').value+' (copy)').slice(0,120);save();notify('Duplicate draft created. Save it to keep both builds.');};
$('abilityFilter').onchange=render;$('tagFilter').onchange=render;
$('archetype').onchange=()=>previewBlueprint($('archetype').value);
$('evidenceMode').onchange=()=>{evidenceMode=$('evidenceMode').value;refreshDirections();render();save();notify(evidenceMode==='verified'?'Verified recommendations only. Custom selections are unchanged.':'Experimental previews use community and legacy evidence. Interactions remain editorial.');};
$('hero').onchange=()=>changeHero($('hero').value); $('rarity').onchange=render; $('search').oninput=render; $('buildName').oninput=save;
$('reset').onclick=()=>{selected=[];talentPlan=[]; render(); save()};
$('copy').onclick=()=>copyText($('buildName').value+' — '+hero+'\n'+getSelectedPowers().map(p=>'- '+p.name+': '+p.description).join('\n'),'Build summary copied.');
$('share').onclick=()=>{try{return copyText(encodeBuild(build(),location.href),importedCatalog?'Link copied. It does not include your imported CSV; recipients need matching data.':'Shareable link copied.');}catch(error){notify(error.message);}};
function exportRows(){return powers.map(p=>p.normalized.provenance.legacy);}
$('download').onclick=()=>{let blob=new Blob([toCSV(exportRows())],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a'); a.href=url; a.download='powers.csv'; a.click(); URL.revokeObjectURL(url)};
$('file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>2000000)throw Error('CSV must be smaller than 2 MB.');const rows=parseCSV(await f.text());const warnings=load(rows);notify(`Imported ${rows.length} powers (memory only). `+warnings.join(' '));save();}catch(error){notify('Import rejected; previous dataset preserved. '+error.message);}finally{e.target.value='';}};
window.addEventListener('hashchange',()=>{hero='All';selected=[];blueprintId='';activeSavedId=null;$('buildName').value='Untitled Madness Build';restore();render();});
loadDataset().then(async data=>{dataset=data;try{recommendations=await loadRecommendations(data);}catch(error){notify(error.message+' Custom builder remains available.');}applyNormalized(data.powers);refreshPowerFilters();refreshDirections();$('dataVersion').textContent=`Data ${data.dataVersion} · updated ${data.updatedAt} · roster incomplete · ${data.powers.some(p=>p.image)?'legacy local image permissions unreviewed':'character thumbnails'}`;
 const coverage=`${data.heroes.length} hero sections · ${data.powers.filter(p=>p.provenance.evidenceType==='saved-community-wiki').length} wiki powers · ${data.powers.filter(p=>p.provenance.evidenceType!=='saved-community-wiki').length} retained legacy entries. General powers are shared across the catalog. Upcoming sections and incomplete source coverage are labeled.`;$('coverage').textContent=coverage;
 notify('Dataset loaded. Choose a hero before selecting powers.');restore();refreshPowerFilters();refreshDirections();render();renderLibrary();
}).catch(error=>{notify('Data failed to load. Serve this folder over HTTP. '+error.message);$('cards').textContent='Power data unavailable; reload after correcting the data files.';});

function swapPlanned(index,id,baseline){
 const h=dataset.heroes.find(h=>h.name===hero),p=powers.find(p=>p.id===id);
 const objective=recommendations?.blueprints.find(b=>b.id===blueprintId);if(objective&&p&&!archetypeRelevant(p.normalized,objective,powers.map(p=>p.normalized),evidenceMode))return;
 if(!h||!p||p.normalized.availability==='disabled'||!powerVisibleForHero(p,hero)||(evidenceMode==='verified'&&(p.normalized.eligibilityStatus!=='verified'||p.normalized.fieldVerification?.description!=='verified'||p.normalized.availability!=='available')))return;
 const ids=[...(plannedOverrides[blueprintId]||baseline)];if(!Number.isInteger(index)||index<0||index>=ids.length)return;const other=ids.indexOf(id);if(other!==-1)ids[other]=ids[index];ids[index]=id;plannedOverrides[blueprintId]=ids;render();save();
}
function resetRecommended(){delete plannedOverrides[blueprintId];customizing=false;render();save();}

function populateRecommended(ids){selected=[...new Set(ids)].slice(0,projectMatch($('progression').matchState||{}).level);render();save();}
