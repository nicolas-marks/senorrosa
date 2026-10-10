export const COLUMNS = ['id','hero','rarity','name','description','tags','source','verified'];
export const HERO_IDS = {"Ana": "ana", "Ashe": "ashe", "Brigitte": "brigitte", "Doctrine": "doctrine", "Domina": "domina", "Emre": "emre", "Genji": "genji", "Junker Queen": "junker-queen", "Juno": "juno", "Kiriko": "kiriko", "Mei": "mei", "Mercy": "mercy", "Moira": "moira", "Orisa": "orisa", "Ramattra": "ramattra", "Reaper": "reaper", "Reinhardt": "reinhardt", "Soldier: 76": "soldier-76", "Torbjörn": "torbjorn", "Winston": "winston"};
export const STATUSES = ['verified','partially_verified','unverified'];
export function parseCSV(text) {
  if (typeof text !== 'string' || text.length > 2000000) throw Error('CSV must be text smaller than 2 MB.');
  const rows=[]; let row=[], cell='', quoted=false, closed=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted) { if(c==='"') { if(text[i+1]==='"'){cell+='"';i++;} else {quoted=false;closed=true;} } else cell+=c; }
    else if(c==='"') { if(cell || closed) throw Error('Unexpected quote in CSV.'); quoted=true; }
    else if(c===',' || c==='\n' || c==='\r') {
      row.push(cell); cell='';closed=false;
      if(c!==',') {if(c==='\r'&&text[i+1]==='\n')i++; if(row.some(x=>x.trim()))rows.push(row);row=[];}
    } else { if(closed) throw Error('Unexpected text after closing quote.');cell+=c; }
  }
  if(quoted)throw Error('Unclosed CSV quote.');
  row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
  const headers=(rows.shift()||[]).map(x=>x.trim().toLowerCase());
  if(headers.length!==COLUMNS.length || new Set(headers).size!==headers.length || COLUMNS.some(x=>!headers.includes(x)))throw Error('CSV requires exactly: '+COLUMNS.join(', '));
  const ids=new Set();
  return rows.map((r,i)=>{
    if(r.length!==headers.length)throw Error(`Row ${i+2}: incorrect column count.`);
    const p=Object.fromEntries(headers.map((h,j)=>[h,r[j].trim()]));
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id)||ids.has(p.id))throw Error(`Row ${i+2}: invalid or duplicate ID.`);
    ids.add(p.id);
    if(!p.name||!p.description||p.name.length>200||p.description.length>5000)throw Error(`Row ${i+2}: invalid name or description.`);
    if(!['Unknown','Common','Epic','Legendary'].includes(p.rarity))throw Error(`Row ${i+2}: invalid rarity.`);
    if(!['yes','no'].includes(p.verified))throw Error(`Row ${i+2}: verified must be yes/no.`);
    if(p.hero!=='All' && p.hero.split(';').some(h=>!Object.hasOwn(HERO_IDS,h.trim())))throw Error(`Row ${i+2}: hero requires a reviewed registry entry.`);
    return p;
  });
}
export function toCSV(rows) {
  const escape=v=> /[",\r\n]/.test(String(v??''))?'"'+String(v??'').replaceAll('"','""')+'"':String(v??'');
  return [COLUMNS.join(','),...rows.map(p=>COLUMNS.map(k=>escape(p[k])).join(','))].join('\r\n');
}
export function normalizePower(p, images={}, trustedBaseline=false) {
  const official=trustedBaseline&&(p.id==='jump-scare'||p.id==='zomnic-summoner');
  return {id:p.id,name:p.name,description:p.description,eligibleHeroIds:p.hero==='All'?null:p.hero.split(';').map(h=>HERO_IDS[h.trim()]),eligibilityStatus:p.hero==='All'?'unverified':'partially_verified',rarity:p.rarity==='Unknown'?null:p.rarity,tags:p.tags.split(';').map(t=>t.trim()).filter(Boolean),affectedAbilityIds:null,effects:null,activationConditions:null,sourceUrl:official?'https://us.forums.blizzard.com/en/overwatch/t/overwatch-retail-patch-notes-%E2%80%93-october-6-2026/1041373':null,verificationStatus:'partially_verified',fieldVerification:{description:official?'verified':'unverified',eligibility:p.hero==='All'?'unverified':'partially_verified',rarity:'unverified'},patchVersion:null,observedAt:official?'2026-10-06':'2026-10-10',availability:'unverified',image:images[p.id]||null,provenance:{legacy:{...p},evidenceType:official?'official-announcement':'screenshot-transcription',evidenceId:null,originalAvailable:false}};
}
export function validateDataset(data) {
  if(!data||data.schemaVersion!==1||typeof data.dataVersion!=='string'||!Array.isArray(data.heroes)||!Array.isArray(data.powers))throw Error('Unsupported dataset structure.');
  const heroIds=new Set(), ids=new Set();
  for(const h of data.heroes){
    if(!/^[a-z0-9-]+$/.test(h.id)||heroIds.has(h.id)||typeof h.name!=='string'||!['available','announced','unverified','unavailable'].includes(h.availability)||!Array.isArray(h.knownPowerIds))throw Error('Invalid hero: '+h.id);
    heroIds.add(h.id);
    if(!['Tank','Damage','Support',null].includes(h.role)||h.baseHealth!==null||h.portrait!==null||!h.availabilityEvidence||!Object.hasOwn(h,'lastVerifiedAt'))throw Error('Invalid hero metadata: '+h.id);
  }
  for(const p of data.powers){
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id)||ids.has(p.id))throw Error('Invalid or duplicate power ID.');ids.add(p.id);
    if(typeof p.name!=='string'||!p.name||typeof p.description!=='string'||!p.description||!STATUSES.includes(p.verificationStatus)||!STATUSES.includes(p.eligibilityStatus)||!['Common','Epic','Legendary',null].includes(p.rarity)||!Array.isArray(p.tags)||p.tags.some(t=>typeof t!=='string'))throw Error('Invalid power: '+p.id);
    if(p.eligibleHeroIds!==null&&(!Array.isArray(p.eligibleHeroIds)||!p.eligibleHeroIds.length||new Set(p.eligibleHeroIds).size!==p.eligibleHeroIds.length||p.eligibleHeroIds.some(h=>!heroIds.has(h))))throw Error('Invalid eligibility: '+p.id);
    if(p.eligibleHeroIds===null&&p.eligibilityStatus!=='unverified')throw Error('Unknown eligibility must stay unverified.');
    if(p.effects!==null||p.activationConditions!==null||p.affectedAbilityIds!==null)throw Error('Structured effects require a later reviewed schema version.');
    if(!p.provenance?.legacy||!p.fieldVerification||['description','eligibility','rarity'].some(k=>!STATUSES.includes(p.fieldVerification[k]))||!['available','disabled','unverified'].includes(p.availability)||!Object.hasOwn(p,'patchVersion')||!Object.hasOwn(p,'observedAt')||!Object.hasOwn(p,'image'))throw Error('Missing or invalid provenance: '+p.id);
    if(p.sourceUrl!==null){let u;try{u=new URL(p.sourceUrl);}catch{throw Error('Invalid source URL.');}if(u.protocol!=='https:')throw Error('Source URL must use HTTPS.');}
    if(p.image&&(!/^assets\/[a-zA-Z0-9_./-]+$/.test(p.image.path)||p.image.path.includes('..')||!['power-crop','ability-fallback'].includes(p.image.kind)))throw Error('Invalid local image.');
  }
  for(const h of data.heroes){const expected=data.powers.filter(p=>p.eligibleHeroIds?.includes(h.id)).map(p=>p.id).sort();if(JSON.stringify([...h.knownPowerIds].sort())!==JSON.stringify(expected)||h.coverage?.known!==expected.length||h.coverage?.status!==(expected.length?'incomplete':'missing')||h.coverage?.expected!==null)throw Error('Incorrect coverage: '+h.id);}
  return data;
}
export async function loadDataset(fetcher=fetch) {
  const get=async path=>{const r=await fetcher(path);if(!r.ok)throw Error('Could not load '+path);return r.json();};
  const manifest=await get('data/manifest.json');
  if(manifest.schemaVersion!==1||typeof manifest.dataVersion!=='string')throw Error('Unsupported data manifest.');
  for(const key of ['heroes','powers','eventRules'])if(typeof manifest.files?.[key]!=='string'||!/^\.\/[a-z0-9.-]+\.json$/.test(manifest.files[key]))throw Error('Invalid manifest path.');
  const [heroes,powers,eventRules]=await Promise.all(['heroes','powers','eventRules'].map(k=>get('data/'+manifest.files[k].slice(2))));
  for(const envelope of [heroes,powers,eventRules])if(envelope.schemaVersion!==1||envelope.dataVersion!==manifest.dataVersion||!Array.isArray(envelope.records))throw Error('Dataset versions do not match.');
  return validateDataset({...manifest,heroes:heroes.records,powers:powers.records,eventRules:eventRules.records});
}
