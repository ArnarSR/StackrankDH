// Felles tidsmodell for veikartet og prioriteringslaben. Begge sider har egne
// datamodeller, men skal regne tid, parallellitet og månedlig opptjening likt.
export const HORIZON_MONTHS=24,WEEKS_PER_MONTH=52/12;
export const HORIZON_WEEKS=HORIZON_MONTHS*WEEKS_PER_MONTH;
// Andel produktiv tid som går tapt når N ting er i gang samtidig. Weinberg (1991)
// er en erfaringsregel, ikke en måling – se faq.html. Tallene er ment å justeres.
export const defaultSwitchingLoss={1:0,2:.2,3:.4,4:.6,5:.75};
export const switchingLoss=(wip,losses=defaultSwitchingLoss)=>{
 const n=Math.max(1,Math.round(wip||1));
 if(losses[n]!==undefined)return losses[n];
 const keys=Object.keys(losses).map(Number).sort((a,b)=>a-b);
 return losses[keys[keys.length-1]]??0;
};
export const focusFactor=(wip,losses)=>Math.max(1e-6,1-switchingLoss(wip,losses));
// Gjennomstrømning relativt til å gjøre én ting av gangen. Med Weinberg-tallene
// topper den seg rundt tre samtidige og faller igjen – en omvendt U.
export const throughput=(wip,losses)=>Math.max(1,Math.round(wip||1))*focusFactor(wip,losses);
// wip baner i parallell. Et element starter når en bane er ledig, men aldri før
// forutsetningene er ferdige. Tapet bruker wip-innstillingen som konstant, ikke
// faktisk samtidighet time for time.
export function scheduleWork(rows,{wip=1,losses=defaultSwitchingLoss}={}){
 const lanes=Array(Math.max(1,Math.round(wip||1))).fill(0);
 const factor=focusFactor(wip,losses);
 const finished=new Map();
 return rows.map(row=>{
  const duration=Math.max(0,Number(row.durationWeeks)||0);
  const stretched=duration/factor;
  const ready=Math.max(0,...(row.requires??[]).map(id=>finished.get(id)??0));
  const lane=lanes.indexOf(Math.min(...lanes));
  const startWeek=Math.max(lanes[lane],ready),endWeek=startWeek+stretched;
  lanes[lane]=endWeek;finished.set(row.id,endWeek);
  const startMonth=Math.floor(startWeek/WEEKS_PER_MONTH),landing=Math.ceil(endWeek/WEEKS_PER_MONTH);
  return {id:row.id,duration,effectiveDuration:stretched,lane,startWeek,endWeek,startMonth,landing,
   workMonths:Math.max(1,landing-startMonth),
   effectMonths:Math.max(0,HORIZON_MONTHS-landing),
   beyondHorizon:landing>=HORIZON_MONTHS};
 });
}
// Månedlig opptjening: gevinst og drift løper fra landing, lønn fordeles over
// arbeidsmånedene, og engangskostnaden belastes ved oppstart. Årsbeløp deles på 12.
export function accrueMonthly(entries,{horizonMonths=HORIZON_MONTHS}={}){
 const months=Array.from({length:horizonMonths},()=>({gross:0,operating:0,labor:0,once:0}));
 const rows=entries.map(entry=>{
  const applied={gross:0,operating:0,labor:0,once:0};
  const apply=(m,field,value)=>{if(m>=0&&m<horizonMonths){months[m][field]+=value;applied[field]+=value}};
  apply(entry.startMonth,'once',entry.once??0);
  const workMonths=Math.max(1,entry.workMonths??1);
  for(let m=entry.startMonth;m<entry.startMonth+workMonths;m++)apply(m,'labor',(entry.labor??0)/workMonths);
  for(let m=entry.landing;m<horizonMonths;m++){
   apply(m,'gross',(entry.annualGross??0)/12);
   apply(m,'operating',(entry.annualOperating??0)/12);
  }
  return {...entry,applied,horizonNet:applied.gross-applied.operating-applied.labor-applied.once};
 });
 let running=0;
 const curve=months.map((m,month)=>{const net=m.gross-m.operating-m.labor-m.once;running+=net;return {month,...m,net,cumulative:running}});
 return {rows,curve,net:running};
}
// Første måned der kumulativ nettoverdi er null eller positiv.
export const breakEvenMonth=curve=>curve.find(m=>m.cumulative>=0)?.month??null;

// Ett tiltak er referansepunktet. 100 % tap ville gi uendelig kalendertid.
export function validateSwitchingLosses(losses){
 if(!losses||typeof losses!=='object'||Array.isArray(losses))return 'Tapstabellen mangler.';
 for(let n=1;n<=5;n++)if(!Number.isFinite(losses[n])||losses[n]<0||losses[n]>=1)return `Tap ved ${n} samtidige må være fra 0 til under 100 %.`;
 if(losses[1]!==0)return 'Tapet ved ett tiltak må være 0 %; dette er sammenligningsgrunnlaget.';
 return '';
}
