import {powerIcon,abilityIcon} from './icons.fc9f2b44a4f9.mjs';
function node(tag,className,text){const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;}
export function createPowerCard(power,{selected=false,eligible=true,onToggle,image=null}) {
 const card=node('article','power'+(selected?' selected':'')+' rarity-'+power.rarity.toLowerCase());
 const top=node('div','power-top');const rarity=node('span','tag '+power.rarity.toLowerCase(),power.rarity==='Unknown'?'Rarity unverified':power.rarity);
 top.append(rarity,node('span','selection-label',selected?'✓ In your build':'Not selected'));
 top.append(powerIcon(power.normalized));
 card.append(top,node('h3','power-title',power.name),node('p','power-description',power.description));
 const details=node('details','power-evidence');details.append(node('summary','', 'Evidence and eligibility'));
 const wiki=power.normalized.provenance.evidenceType==='saved-community-wiki';
 details.append(node('p','',`Associated heroes: ${power.normalized.provenance.section==='General Powers'?'Shared general power':power.hero}. ${power.normalized.verificationStatus.replaceAll('_',' ')}; current game behavior requires further review.`));
 details.append(node('p','',wiki?'Description, rarity and hero association transcribed from the saved Weird Gloop community wiki.':power.normalized.provenance.evidenceType==='official-announcement'?'Description traced to the official release announcement.':'Retained legacy screenshot transcription; absent from this wiki snapshot.'));
 if(power.normalized.availability==='disabled')details.append(node('p','', 'Disabled in the official known-issues snapshot; cannot be selected.'));
 for(const ability of power.normalized.provenance.abilityReferences||[]){
  const link=node('a','',ability.name);link.append(abilityIcon(ability.name));link.className='icon-label';link.href=ability.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';details.append(link,node('span','', ' · '));
 }
 if(power.normalized.sourceUrl){const link=node('a','', 'Read source');link.href=power.normalized.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';details.append(link);}
 const action=node('button',selected?'remove-action':'add-action',selected?'Remove power':'Add to build');action.type='button';action.dataset.powerId=power.id;action.setAttribute('aria-label',`${selected?'Remove':'Add'} ${power.name}${selected?'':' to build'}`);action.setAttribute('aria-pressed',String(selected));action.disabled=!eligible||power.normalized.availability==='disabled';action.onclick=()=>onToggle(power.id);
 card.append(details,action);return card;
}
