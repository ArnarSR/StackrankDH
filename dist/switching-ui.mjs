import {defaultSwitchingLoss,switchingLoss,throughput,validateSwitchingLosses} from './timeline.mjs';
const number=v=>new Intl.NumberFormat('nb-NO',{maximumFractionDigits:2}).format(v);
// Samme kontroll på begge flater; hver flate beholder sine egne lagrede parametre.
export function bindSwitchingLosses(host,read,write,onChange){
 function render(){
  const losses=read();
  host.innerHTML=`<h3>Tap ved kontekstbytte</h3><p>Andel tid tapt ved parallelle tiltak. Weinberg-tallene er en erfaringsregel, ikke en måling. Endrer kalendertid, ikke teamkostnaden. Ved 6–8 samtidige brukes tapet for 5.</p>
   <div class="switching-grid">${[1,2,3,4,5].map(n=>`<label>${n} ${n===1?'tiltak':'samtidige'}<input aria-label="Tap ved ${n} samtidige (%)" data-loss="${n}" type="number" min="0" max="99.999999" step="any" required value="${switchingLoss(n,losses)*100}"${n===1?' disabled':''}><small>Tap i % · <strong data-throughput="${n}">${number(throughput(n,losses))}×</strong> gjennomstrømning</small></label>`).join('')}</div>
   <p class="field-help">Gjennomstrømning = antall samtidige × (1 − tap), relativt til ett tiltak av gangen.</p><div class="error" role="alert" data-loss-error></div><button type="button" class="secondary" data-reset-loss>Bruk Weinbergs standard</button>`;
 }
 host.addEventListener('input',e=>{
  const n=e.target.dataset.loss;if(!n)return;
  const inputs=[...host.querySelectorAll('[data-loss]')];
  const losses=Object.fromEntries(inputs.map(el=>[el.dataset.loss,el.valueAsNumber/100]));
  const error=validateSwitchingLosses(losses);
  for(const el of inputs)el.setAttribute('aria-invalid',String(!Number.isFinite(losses[el.dataset.loss])||losses[el.dataset.loss]<0||losses[el.dataset.loss]>=1));
  host.querySelector('[data-loss-error]').textContent=error?error+' Beregningen bruker sist gyldige tap.':'';
  if(error)return;
  write(losses);
  for(const el of host.querySelectorAll('[data-throughput]'))el.textContent=number(throughput(Number(el.dataset.throughput),losses))+'×';
  onChange?.();
 });
 host.addEventListener('click',e=>{if(!e.target.closest('[data-reset-loss]'))return;write({...defaultSwitchingLoss});render();onChange?.()});
 render();return render;
}
