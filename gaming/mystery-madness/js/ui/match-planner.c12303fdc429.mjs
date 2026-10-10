export function renderMatchPlanner(container){
 const state=container.matchState||{};state.planningLevel=8;container.matchState=state;
 container.replaceChildren();container.hidden=true;container.matchProjection={level:8};return container.matchProjection;
}
