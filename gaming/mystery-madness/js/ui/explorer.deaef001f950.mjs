import {HERO_PORTRAITS} from '../portraits.cae1fb01082d.mjs';
export function filterHeroes(heroes,query='',role='All') {
  const term=query.trim().toLocaleLowerCase();
  return heroes.filter(h=>(role==='All'||h.role===role)&&h.name.toLocaleLowerCase().includes(term));
}
function node(tag,className,text){const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;}
export function renderHeroGallery(container,heroes,{query,role,selected,powers,onSelect}) {
 container.replaceChildren();
 const list=filterHeroes(heroes,query,role);
 for(const h of list){
  const count=powers.filter(p=>p.normalized.eligibleHeroIds?.includes(h.id)).length;
  const button=node('button','hero-tile'+(selected===h.name?' active':''));button.type='button';button.dataset.heroId=h.id;button.setAttribute('aria-pressed',String(selected===h.name));
  const portrait=node('span','portrait portrait-'+h.id);portrait.setAttribute('aria-hidden','true');
  const mark=node('span','portrait-mark',h.name==='Soldier: 76'?'76':h.name.slice(0,2).toUpperCase());
  portrait.append(mark);
  const asset=HERO_PORTRAITS[h.id];
  if(asset){const img=node('img','hero-thumbnail');img.src=asset.path;img.alt='';img.width=96;img.height=96;img.loading='lazy';img.decoding='async';img.onerror=()=>{img.hidden=true;};portrait.append(img);}
  const body=node('span','hero-tile-body');
  body.replaceChildren(node('span','hero-name',h.name),node('span','hero-role',h.role||'Role unverified'));
  if(h.availability==='announced')body.append(node('span','availability','Upcoming'));
  button.title=`${h.name} · ${h.role||'Role unverified'} · ${count} cataloged powers${h.availability==='announced'?' · Upcoming; unlock unconfirmed':''}`;
  button.setAttribute('aria-label',`Explore ${h.name}${h.availability==='announced'?', upcoming hero':''}`);
  button.append(portrait,body);button.onclick=()=>onSelect(h.name);container.append(button);
 }
 if(!list.length)container.append(node('p','empty',role==='Tank'?'No tank records yet. The event roster is still being verified.':'No heroes match these filters. Try another name or role.'));
 return list.length;
}
