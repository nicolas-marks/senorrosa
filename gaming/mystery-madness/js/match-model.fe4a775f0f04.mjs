import {analyzeBuild} from './recommendations.e0c600d8e1e5.mjs';
// Scenario assumptions, not measured average-player statistics or game rules.
export const DEFAULT_MATCH={minutes:15,elapsed:5,activeFraction:.8,eventsPerMinute:4,xpPerEvent:4,growth:20,usefulChoiceFraction:.35,randomHero:false};
export function cumulativeXP(level,growth=20){return 45*level+growth*level*(level-1)/2;}
export function talentsAtPace(plan,projection){
 const count=Math.min(plan.length,Math.max(0,Math.round(projection.level)));
 return [...new Set(plan)].slice(0,count);
}
export function projectMatch(input={}){
 const s={...DEFAULT_MATCH,...input};
 for(const [key,min,max] of [['minutes',1,60],['elapsed',0,60],['activeFraction',.1,1],['eventsPerMinute',0,30],['xpPerEvent',3,5],['growth',0,200],['usefulChoiceFraction',0,1]])if(!Number.isFinite(s[key])||s[key]<min||s[key]>max)throw Error('Invalid match assumption: '+key);
 s.elapsed=Math.min(s.elapsed,s.minutes);
 const rate=60*s.activeFraction+s.eventsPerMinute*s.xpPerEvent;
 const levelAt=(minutes,eventXP=s.xpPerEvent)=>{const xp=minutes*(60*s.activeFraction+s.eventsPerMinute*eventXP)+(s.randomHero?20:0);let level=0;while(level<100&&cumulativeXP(level+1,s.growth)<=xp)level++;return level;};
 if(s.planningLevel!==undefined&&(!Number.isInteger(s.planningLevel)||s.planningLevel<1||s.planningLevel>8))throw Error('Invalid planning level.');
 return {...s,xpPerMinute:rate,xp:s.elapsed*rate+(s.randomHero?20:0),level:s.planningLevel!==undefined?8:levelAt(s.elapsed),levelRange:[levelAt(s.elapsed,3),levelAt(s.elapsed,5)],checkpoints:[1,2,3].map(round=>({round,minutes:s.minutes*round/3,level:levelAt(s.minutes*round/3)})),levelAt};
}
export function comparePaths({blueprints,powers,heroId,selectedIds,level,usefulChoiceFraction=.35,rules=[]}){
 return blueprints.filter(b=>b.heroId===heroId&&b.category).map(b=>{
  const actual=analyzeBuild({blueprint:b,powers,selectedIds,rules,mode:'experimental'});
  // Expected useful choices are allocated in authored priority order. Fractional
  // credit interpolates a scenario budget; it does not predict specific offers.
  let budget=Math.max(0,level-selectedIds.length)*usefulChoiceFraction,points=actual.earned;
  const covered=new Set(actual.matches.map(m=>m.step));
  const total=b.steps.reduce((n,s)=>n+s.weight,0);
  for(const step of b.steps){if(covered.has(step.label))continue;const fraction=Math.min(1,budget);points+=step.weight*fraction;budget=Math.max(0,budget-1);}
  return {id:b.id,category:b.category,strategy:b.strategy,actualFit:actual.score,projectedFit:Math.max(actual.score,Math.min(100,Math.round(100*(points+actual.adjustment)/total))),next:b.steps.find(s=>!selectedIds.includes(s.powerId)&&!s.alternatives.some(a=>selectedIds.includes(a.powerId)))?.powerId||null};
 }).sort((a,b)=>b.actualFit-a.actualFit||b.projectedFit-a.projectedFit||a.id.localeCompare(b.id));
}
