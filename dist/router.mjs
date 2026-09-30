// Hash-basert ruting. Parsing og formatering er rene funksjoner uten DOM, slik at
// de kan testes; bindRouter kobler dem til siden.
export const views={
 portfolio:{hash:'portefolje',section:'portfolio',label:'Tiltaksportefølje',icon:'▦',title:'Tiltaksportefølje'},
 measure:{hash:'tiltak',section:'measure-page',label:'Tiltak',icon:'◈',title:'Tiltak',hidden:true},
 segments:{hash:'segmenter',section:'segments',label:'Segmenter',icon:'◑',title:'Kundesegmenter'},
 strategy:{hash:'strategi',section:'strategy',label:'Visjon og OKR',icon:'◎',title:'Visjon, objectives og key results'},
 roadmap:{hash:'veikart',section:'roadmap',label:'Veikart',icon:'▤',title:'Veikart'},
 scenarios:{hash:'scenarioer',section:'scenarios',label:'Scenarioer',icon:'∿',title:'Scenarioer'},
 roster:{hash:'roller',section:'roster',label:'Roller og kapasitet',icon:'◧',title:'Roller, ferdigheter og kapasitet'},
 problems:{hash:'nakostnader',section:'problems',label:'Nåkostnader',icon:'◉',title:'Nåkostnader'},
 parameters:{hash:'parametre',section:'parameters',label:'Parametre',icon:'⚙',title:'Parametre'},
 capacity:{hash:'kapasitet',section:'capacity',label:'Teambelastning',icon:'▥',title:'Teambelastning'},
 method:{hash:'metode',section:'method',label:'Metode',icon:'ƒ',title:'Metode og formler'}
};
export const DEFAULT_VIEW='portfolio';
// Underankere på en tiltaksside. Brukes av dybdeklikk fra rangeringen.
export const measureAnchors=['segmenter','kostnader','risiko','kilder','oppgaver'];
const byHash=Object.fromEntries(Object.entries(views).map(([key,v])=>[v.hash,key]));
export function parseRoute(hash){
 const raw=String(hash??'').replace(/^#/,'').replace(/^\//,'');
 const parts=raw.split('/').filter(Boolean).map(decodeURIComponent);
 if(!parts.length)return {view:DEFAULT_VIEW};
 const view=byHash[parts[0]];
 if(!view)return {view:DEFAULT_VIEW,unknown:parts[0]};
 if(view!=='measure')return {view};
 if(!parts[1])return {view:DEFAULT_VIEW,unknown:'tiltak uten id'};
 const anchor=measureAnchors.includes(parts[2])?parts[2]:undefined;
 return anchor?{view,measureId:parts[1],anchor}:{view,measureId:parts[1]};
}
export function routeHash({view=DEFAULT_VIEW,measureId,anchor}={}){
 const config=views[view];
 if(!config)return '#/'+views[DEFAULT_VIEW].hash;
 if(view!=='measure')return '#/'+config.hash;
 if(!measureId)return '#/'+views[DEFAULT_VIEW].hash;
 const parts=[config.hash,encodeURIComponent(measureId)];
 if(anchor&&measureAnchors.includes(anchor))parts.push(anchor);
 return '#/'+parts.join('/');
}
export const sameRoute=(a,b)=>routeHash(a)===routeHash(b);
export function navigate(route){
 const next=routeHash(route);
 if(location.hash===next)window.dispatchEvent(new HashChangeEvent('hashchange'));
 else location.hash=next;
}
// onNavigate får ruten. Ruteren eier visning/skjuling, menyen og fokus;
// hva som rendres i en visning er appens ansvar.
export function bindRouter(onNavigate){
 const apply=()=>{
  const route=parseRoute(location.hash);
  const config=views[route.view];
  for(const [key,v] of Object.entries(views)){
   const section=document.getElementById(v.section);
   if(section)section.hidden=key!==route.view;
  }
  for(const link of document.querySelectorAll('.nav[data-view]'))
   link.classList.toggle('active',link.dataset.view===route.view);
  // Visningen kan gi en mer presis tittel enn registeret, f.eks. tiltakets navn.
  const title=onNavigate(route);
  document.title=`Churn Studio · ${title||config.title}`;
  const section=document.getElementById(config.section);
  const heading=section?.querySelector('h1,h2');
  if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true})}
  const target=route.anchor?document.getElementById(`measure-${route.anchor}`):null;
  (target??section)?.scrollIntoView({block:'start',behavior:'instant'});
 };
 window.addEventListener('hashchange',apply);
 apply();
 return {apply};
}
