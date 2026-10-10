import {availableBlueprints,bestRecommendation,archetypeRelevant,usablePower,analyzeBuild,evaluateArchetype,rankedFallbacks,adventureInsights} from '../recommendations.e0c600d8e1e5.mjs';
import {powerIcon,powerLabel,heroIcon,pathIcon} from './icons.fc9f2b44a4f9.mjs';
const CATEGORIES=[['big-dps','BIG DPS','✦'],['tanky','TANKY','◆'],['spooky','SPOOKY','☠'],['support','SUPPORT','✚']];
function node(tag,className,text){const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;}
function skillNode(power,{selectedIds,onToggle,reason='',main=false,interaction='',glyph='✦'}) {
 const selected=selectedIds.includes(power.id),disabled=power.availability==='disabled';
 const tile=node('article','skill-node rarity-'+(power.rarity||'unknown').toLowerCase()+(selected?' allocated':'')+(main?' main-node':''));
 const button=node('button','skill-button');button.type='button';button.dataset.powerId=power.id;button.setAttribute('aria-pressed',String(selected));button.setAttribute('aria-label',`${selected?'Remove':'Add'} ${power.name}${disabled?' (disabled in known-issues snapshot)':''}`);button.disabled=disabled;
 const icon=powerIcon(power,40);
 button.append(icon,node('span','skill-name',power.name),node('span','skill-rank',selected?'✓ Selected':disabled?'Disabled':main?'Mark acquired':'Mark acquired'));button.onclick=()=>onToggle(power.id);tile.append(button,node('span','skill-rarity',power.rarity||'Rarity unknown'));
 const info=node('button','power-info','Power details');info.type='button';info.setAttribute('aria-label','Details for '+power.name);info.onclick=()=>showDetails(power,reason,interaction);tile.append(info);return tile;
}
function showDetails(power,reason,interaction){const panel=document.getElementById('powerDetailPanel');if(!panel)return;panel.replaceChildren();panel.hidden=false;const close=node('button','detail-close','Close');close.onclick=()=>{panel.hidden=true;};panel.append(close,powerLabel(power),node('p','',power.description),node('p','subtle',reason),node('p','synergy-reason',interaction));if(power.sourceUrl){const link=node('a','','Power source');link.href=power.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';panel.append(link);}

}
function explore(container,powers,heroId,settings) {
 const specific=powers.filter(p=>p.eligibleHeroIds?.includes(heroId)&&p.provenance.section!=='General Powers');
 const shared=powers.filter(p=>p.eligibleHeroIds?.includes(heroId)&&p.provenance.section==='General Powers');
 container.append(node('h3','','Explore your own path'),node('p','subtle','Mix powers freely. Click a node to add or remove it; open its effect to inspect the mechanics. Rarity rows are catalog groups, not unlock levels.'));
 const group=(list,host)=>{for(const rarity of ['Common','Epic','Legendary',null]){const matches=list.filter(p=>p.rarity===rarity);if(!matches.length)continue;host.append(node('h4','tree-tier',rarity||'Unknown rarity'));const grid=node('div','explore-skill-grid');for(const p of matches)grid.append(skillNode(p,settings));host.append(grid);}};
 group(specific,container);
 const general=node('details','general-tree');general.append(node('summary','',`Shared general powers (${shared.length})`));group(shared,general);container.append(general);
}
export function renderBuildExplorer({container,analysisContainer,data,bundle,heroId,mode,blueprintId,selectedIds,onUse,onPreview,onFallback,plannedIds,customizing=false,onCustomize,onSwap,onReset,projection={level:0,elapsed:0}}) {
 const navigation=document.getElementById('pathNavigation'),focusedSlot=document.activeElement?.dataset?.slotIndex,pathScroll=container.querySelector?.('.progression-path')?.scrollLeft||0,verticalScroll=container.scrollTop||0;
 container.replaceChildren();analysisContainer.replaceChildren();navigation?.replaceChildren();if(!heroId)return;
 const eligible=bundle?availableBlueprints(bundle.blueprints,data.powers,heroId,mode):[];
 const options=eligible.filter(b=>b.category),active=eligible.find(b=>b.id===blueprintId);
 container.append(node('p','subtle','Choose your playstyle, preview its match progression, then mark the powers you actually choose.'));
 const nav=node('div','tree-navigation');nav.setAttribute('aria-label','Playstyle paths');
 for(const [id,label,glyph] of CATEGORIES){const b=options.find(b=>b.category===id),button=node('button','tree-tab path-'+id+(b&&active?.id===b.id?' active':''));button.type='button';button.disabled=!b;button.setAttribute('aria-pressed',String(!!b&&active?.id===b.id));button.append(pathIcon(id),node('strong','',label));button.onclick=()=>onPreview(b.id);nav.append(button);}
 const free=node('button','tree-tab'+(!active?' active':''));free.type='button';free.setAttribute('aria-pressed',String(!active));free.append(node('span','tree-tab-icon','+'),node('strong','','YOUR ADVENTURE'));free.onclick=()=>onPreview('');nav.append(free);(navigation||container).append(nav);
 // The slider stays in its permanent sibling host throughout a live drag.
 const map=new Map(data.powers.map(p=>[p.id,p])),settings={selectedIds,onToggle:onFallback};
 if(mode==='verified'&&!options.length)container.append(node('p','notice','No independently verified recommended paths are available in this catalog. Your Adventure remains available. Community previews are provisional, never promoted to verified evidence.'));
 if(!active){
  container.append(node('h3','','Your Adventure'),node('p','subtle','Your choices stay yours. Match time never adds or removes powers. Browse the tree below; suggestions are optional.'));
  const insights=adventureInsights({powers:data.powers,heroId,selectedIds,rules:bundle?.rules||[],blueprints:bundle?.blueprints||[],mode});
  analysisContainer.append(node('h2','','My Build Fit'),node('div','fit-score',insights.strongest?`${insights.strongest.fit.score}/100`:selectedIds.length?'Not evaluable':'Not started'));
  if(insights.strongest)container.append(node('p','subtle',`Emerging playstyle: ${insights.strongest.blueprint.archetype}. Fit combines target coverage (50 points), source-effect role compatibility (35 points), and explicit interaction rules (up to 15 points). This is an editorial score, not a win rate.`));
  if(insights.strongest){const fit=insights.strongest.fit,explain=node('details','fit-details');explain.append(node('summary','','My Build Fit calculation'),node('p','',`${fit.targetPoints.toFixed(1)}/50 target coverage + ${fit.compatibilityPoints.toFixed(1)}/35 average role compatibility + ${fit.interactionPoints} explicit interaction points. Rounded and clamped to 0-100. This evaluates only your selections against the closest emerging archetype; there is no prescribed pathway.`),node('p','subtle',`Role rules: direct = ${fit.compatibilityRule.direct}; enabling = ${fit.compatibilityRule.enabling}. Both signals: 100%; direct only: 75%; enabling only: 50%; neither: 0%. Shared-ability clues do not receive interaction bonuses.`));analysisContainer.append(explain);}
  const info=node('section','adventure-insights');info.setAttribute('aria-label','Emerging combinations and optional improvements');
  for(const r of insights.interactions)info.append(node('p','synergy-reason',`${r.verificationStatus}: ${r.explanation}`));
  for(const pair of insights.overlaps.slice(0,4)){const row=node('p','subtle');for(const id of pair.powerIds)row.append(powerLabel(map.get(id)));row.append(node('span','',pair.text));info.append(row);}
  if(!insights.interactions.length&&!insights.overlaps.length)info.append(node('p','subtle','No documented interaction or shared-ability combination identified yet. Add powers to explore their relationships.'));
  if(insights.suggestion){const p=map.get(insights.suggestion.powerId),detail=node('details','power-evidence');detail.append(node('summary','',`Optional improvement: ${p.name}`),node('p','',insights.suggestion.reason),node('p','',insights.suggestion.interaction||'Interaction not established.'));const add=node('button','','Choose this power');add.onclick=()=>onFallback(p.id);detail.append(add);info.append(detail);}
  container.append(info);const scroll=node('div','tree-scroll');explore(scroll,data.powers,heroId,settings);container.append(scroll);return;
 }
 const horizon=Math.min(active.steps.length,Math.max(0,projection.level));
 const engine=bestRecommendation({blueprint:active,powers:data.powers,rules:bundle.rules,mode,horizon});
 const fullIds=plannedIds||engine.ids;
 const theme=CATEGORIES.find(c=>c[0]===active.category);
 const heading=node('h3','path-title');heading.append(heroIcon(heroId),node('span','',active.name));container.append(heading,node('p','subtle',active.strategy));
 const tools=node('div','blueprint-controls');tools.append(node('strong','',plannedIds?'Customized blueprint':'Engine recommendation'));const customize=node('button','primary',customizing?'Finish Customizing':'Customize');customize.onclick=onCustomize;tools.append(customize);const reset=node('button','','Reset to Recommended');reset.disabled=!plannedIds;reset.onclick=onReset;tools.append(reset);container.append(tools);
 container.append(node('p','mini-note',`Highest score among ${engine.evaluated} eligible authored preferred/fallback combinations. Scores are theoretical; source evidence remains provisional in community mode.`));
 container.append(node('p','planning-status',`Level ${projection.level}: pursue the first ${horizon} of ${active.steps.length} preferred targets. ${selectedIds.length} powers marked chosen. Offers arrive on death or round transitions; these targets are not automatic unlocks.`));
 const preview=node('ol','mini-cascade recommended-cascade');
 for(const step of active.steps.slice(0,horizon)){const p=map.get(fullIds[active.steps.indexOf(step)]),item=node('li','mini-choice rarity-'+(p.rarity||'unknown').toLowerCase()+(selectedIds.includes(p.id)?' picked':''));item.append(powerLabel(p));item.title=`${p.rarity||'Unknown rarity'} - ${step.reason}`;preview.append(item);}
 if(!horizon)preview.append(node('li','mini-choice','Slide match time to preview targets'));
 container.append(preview);
 const tree=node('div','progression-path path-'+active.category);tree.setAttribute('aria-label',active.name+' preferred powers and RNG alternatives');tree.tabIndex=0;
 for(const [index,step] of active.steps.slice(0,horizon).entries()){
  const reached=index<horizon,tier=node('section','path-stage'+(reached?' in-horizon':' future-stage'));
  const stage=index<3?'Opening':index<6?'Build engine':'Late match';
  tier.append(node('h4','tree-tier-label',`${stage} - target ${index+1}${reached?' - pursue now':' - later target'}`));
  tier.append(node('span','branch-label','Preferred'));
  tier.append(skillNode(map.get(fullIds[index]),{...settings,reason:fullIds[index]===step.powerId?step.reason:'Customized or optimized alternative. Source effect: '+map.get(fullIds[index]).description,interaction:step.interaction||'Interaction not established.',main:true,glyph:theme?.[2]}));
  if(customizing){const label=node('label','slot-editor');label.append(node('span','',`Replace talent ${index+1}`));const select=node('select','');select.setAttribute('aria-label',`Replace talent ${index+1}`);select.dataset.slotIndex=String(index);for(const p of data.powers.filter(p=>usablePower(p,heroId,mode)&&archetypeRelevant(p,active,data.powers,mode)).sort((a,b)=>a.name.localeCompare(b.name))){const option=node('option','',`${p.name} - ${p.rarity||'Unknown'}`);option.value=p.id;select.append(option);}select.value=fullIds[index];select.onchange=()=>onSwap(index,select.value,engine.ids);label.append(select);tier.append(label);}
  const synergy=node('p','synergy-reason');synergy.append(powerIcon(map.get(fullIds[index]),20),node('span','',fullIds[index]===step.powerId?step.interaction||'Editorial role target; interaction behavior untested.':'Replacement uses its own source effect. Original target interaction is not assumed to apply.'));tier.append(synergy);
  const fallback=node('details','rng-branch');fallback.open=true;fallback.append(node('summary','','If RNG misses this pick'));
  for(const alt of step.alternatives)fallback.append(skillNode(map.get(alt.powerId),{...settings,reason:alt.reason,glyph:theme?.[2]}));
  if(!step.alternatives.length)fallback.append(node('p','subtle','No eligible fallback is documented for this target.'));
  tier.append(fallback);tree.append(tier);
 }
 if(!horizon)tree.append(node('p','empty','No planned slots yet. Move match time to preview the first targets.'));
 tree.scrollLeft=pathScroll;
 if(active.optionalLegendary&&horizon===active.steps.length){const p=map.get(active.optionalLegendary.powerId);if(p&&p.eligibleHeroIds?.includes(heroId)&&p.availability!=='disabled'){const extra=node('section','path-stage optional-legendary-branch');extra.append(node('h4','','Optional second Legendary'),node('p','subtle',active.optionalLegendary.reason),skillNode(p,{...settings,reason:active.optionalLegendary.reason}));tree.append(extra);}}
 container.append(tree,node('p','mini-note','Connections show recommendation order and RNG pivots, not game prerequisites. Eight targets and one main Legendary are planning defaults, not confirmed capacity rules. Rarity has no assumed level gate.'));
 const why=node('details','power-evidence');why.append(node('summary','','Evidence and recommendation method'),node('p','',active.why),node('p','',active.limitations),node('p','notice','Community source effects and hero associations are partially verified; combinations are theoretical. Strict verified-only mode withholds these paths.'));container.append(why);
 const recommendedIds=fullIds.slice(0,horizon);
 const blueprintFit=evaluateArchetype({blueprint:active,powers:data.powers,selectedIds:recommendedIds,rules:bundle.rules,mode});
 const myFit=evaluateArchetype({blueprint:active,powers:data.powers,selectedIds,rules:bundle.rules,mode});
 function scoreCard(label,result,empty,className){const card=node('section','fit-card '+className);card.append(node('h2','',label),node('div','fit-score',result.started?`${result.score}/100`:empty));const explain=node('details','fit-details');explain.append(node('summary','','How this score works'),node('p','',`Target coverage: ${result.targetPoints?.toFixed(1)||result.earned}/50; source-effect role compatibility: ${result.compatibilityPoints?.toFixed(1)||0}/35; explicit interaction rules: ${result.interactionPoints||0} points (bounded to -15..15). Sum, round and clamp to 0-100.`),node('p','',`${result.earned}/${result.possible} weighted target points covered. Preferred targets earn full weight; fallbacks earn 65%; only one option per target counts. Role signals earn 100% for direct + enabling effects, 75% for direct, 50% for enabling only, or 0% for no match; averaged over eligible powers.`));
 explain.append(node('p','subtle',`Role signal rules: direct = ${result.compatibilityRule.direct}; enabling = ${result.compatibilityRule.enabling}. Matched against source descriptions, case-insensitive.`));
 for(const row of result.compatibility||[])explain.append(node('p','',`${map.get(row.powerId).name}: ${Math.round(row.value*100)}% role compatibility - ${row.reason}.`));
 for(const r of result.interactions)explain.append(node('p','synergy-reason',`${r.verificationStatus}: ${r.explanation} (${r.weight} points)`));
 if(!result.interactions.length)explain.append(node('p','subtle','No explicit interaction rule matched. Shared-ability clues earn no synergy bonus; missing rules are not evidence of incompatibility.'));
 explain.append(node('p','subtle','Editorial rules-based fit, not proven optimization, damage or win rate. Community source effects remain partially verified.'));card.append(explain);return card;}
 const originalFit=evaluateArchetype({blueprint:active,powers:data.powers,selectedIds:engine.ids.slice(0,horizon),rules:bundle.rules,mode});
 if(plannedIds){const delta=blueprintFit.score-originalFit.score,changes=node('p','customization-impact');const added=blueprintFit.interactions.filter(r=>!originalFit.interactions.some(o=>o.id===r.id)),lost=originalFit.interactions.filter(r=>!blueprintFit.interactions.some(o=>o.id===r.id));changes.textContent=`Archetype Fit change: ${delta>=0?'+':''}${delta} versus recommended (${originalFit.score}/100). ${added.length} interaction rules gained; ${lost.length} lost. Compatibility: ${blueprintFit.compatibilityPoints.toFixed(1)} vs ${originalFit.compatibilityPoints.toFixed(1)} points. Coverage: ${blueprintFit.targetPoints.toFixed(1)} vs ${originalFit.targetPoints.toFixed(1)} points.`;for(const rule of added)changes.append(node('span','',` Gained: ${rule.explanation}`));for(const rule of lost)changes.append(node('span','',` Lost: ${rule.explanation}`));container.append(changes);}
 tree.scrollLeft=pathScroll;container.scrollTop=verticalScroll;
 if(focusedSlot!==undefined)container.querySelector?.(`[data-slot-index="${focusedSlot}"]`)?.focus({preventScroll:true});
 analysisContainer.append(scoreCard(plannedIds?'Customized Archetype Fit':'Blueprint Fit',blueprintFit,'No targets yet','blueprint-fit'),scoreCard('My Build Fit',myFit,selectedIds.length?'Not evaluable':'Not started','my-build-fit'));
}
