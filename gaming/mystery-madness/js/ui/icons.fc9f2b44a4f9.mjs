import {POWER_ICONS} from '../power-icons.ec738368c7f1.mjs';
import {ABILITY_ICONS} from '../ability-icons.27a9412ffdee.mjs';
import {HERO_PORTRAITS} from '../portraits.cae1fb01082d.mjs';
export const PLACEHOLDER='assets/icons/power-placeholder.svg';
const key=name=>name?.toLowerCase().replace(/[^a-z0-9]/g,'');
export function powerArtwork(power){
 const p=power.normalized||power;
 if(POWER_ICONS[p.id])return {path:POWER_ICONS[p.id],kind:'Power artwork'};
 const ability=p.provenance?.abilityReferences?.find(a=>ABILITY_ICONS[key(a.name)]);
 if(ability)return {path:ABILITY_ICONS[key(ability.name)],kind:ability.name+' ability icon'};
 if(p.image?.path?.startsWith('assets/abilities/'))return {path:p.image.path,kind:'Ability icon'};
 return {path:PLACEHOLDER,kind:'Artwork unavailable'};
}
export function assetIcon(path,title,{rarity='',size=32}={}){
 const frame=document.createElement('span');frame.className='game-icon rarity-'+(rarity||'unknown').toLowerCase();frame.title=title;frame.setAttribute('aria-hidden','true');
 const img=document.createElement('img');img.src=path||PLACEHOLDER;img.alt='';img.width=size;img.height=size;img.loading='lazy';img.decoding='async';
 img.onerror=()=>{img.onerror=null;img.src=PLACEHOLDER;frame.title='Artwork unavailable';};frame.append(img);return frame;
}
export function powerIcon(power,size=32){const art=powerArtwork(power);return assetIcon(art.path,art.kind,{rarity:power.rarity,size});}
export function powerLabel(power,{size=24,rarity=true}={}){
 const label=document.createElement('span');label.className='icon-label';label.append(powerIcon(power,size));const name=document.createElement('span');name.textContent=power.name;label.append(name);
 if(rarity){const badge=document.createElement('span');badge.className='rarity-mark rarity-'+(power.rarity||'unknown').toLowerCase();badge.textContent=({Common:'C',Epic:'E',Legendary:'L'})[power.rarity]||'?';badge.title=power.rarity||'Unknown rarity';badge.setAttribute('aria-label',power.rarity||'Unknown rarity');label.append(badge);}return label;
}
export function heroIcon(heroId){return assetIcon(HERO_PORTRAITS[heroId]?.path,'Hero portrait',{size:28});}
export function abilityIcon(name){return assetIcon(ABILITY_ICONS[key(name)],name+' ability icon',{size:20});}
export function pathIcon(category){const ability=({'big-dps':'Death Blossom',tanky:'Fortify',support:'Healing Ofuda',spooky:'Primal Rage'})[category];return abilityIcon(ability);}
