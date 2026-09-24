import {validateIssue} from './model.mjs';

export function createFormValidation(form,readDraft){
 const summary=document.getElementById('form-error');
 let attempted=false,current=null,serial=0,queued=false;
 form.noValidate=true;
 function resolve(target){
  if(target.scope==='main')return target.field==='effectSourceId'?document.getElementById('effect-source'):form.elements.namedItem(target.field);
  const attr=`data-${target.scope}-id`;
  const row=[...form.querySelectorAll(`[${attr}]`)].find(el=>el.getAttribute(attr)===target.id);
  return row?[...row.querySelectorAll('[data-field]')].find(el=>el.dataset.field===target.field):null;
 }
 function clear(){
  form.querySelectorAll('[data-validation-error]').forEach(el=>el.remove());
  form.querySelectorAll('[data-validation-mark]').forEach(el=>{
   el.removeAttribute('aria-invalid');
   const ids=(el.getAttribute('aria-describedby')??'').split(/\s+/).filter(id=>id&&!id.startsWith('field-error-'));
   if(ids.length)el.setAttribute('aria-describedby',ids.join(' '));else el.removeAttribute('aria-describedby');
   el.removeAttribute('data-validation-mark');
  });
  summary.replaceChildren();
 }
 function nativeIssue(){
  const el=[...form.elements].find(el=>el.willValidate&&!el.validity.valid);
  if(!el)return null;
  const label=el.closest('label')?.firstChild?.textContent.trim()||'Feltet';
  let message;
  if(el.validity.badInput)message=`${label}: skriv inn et gyldig tall.`;
  else if(el.validity.valueMissing)message=`${label}: fyll ut feltet.`;
  else if(el.validity.typeMismatch)message=`${label}: skriv inn en fullstendig lenke, for eksempel https://eksempel.no/dokument.`;
  else if(el.validity.rangeUnderflow)message=`${label}: verdien må være minst ${el.min}.`;
  else if(el.validity.rangeOverflow)message=`${label}: verdien kan ikke være høyere enn ${el.max}.`;
  else if(el.validity.stepMismatch)message=`${label}: bruk et heltall.`;
  else message=`${label}: ${el.validationMessage}`;
  return {message,elements:[el]};
 }
 function findIssue(){const native=nativeIssue();if(native)return native;const issue=validateIssue(readDraft());return issue?{...issue,elements:issue.targets.map(resolve).filter(Boolean)}:null;}
 function focusIssue(){const el=current?.elements.find(el=>!el.disabled);if(!el)return;el.focus({preventScroll:true});el.scrollIntoView({block:'center',behavior:'instant'});}
 function show(issue,focus){
  clear();current=issue;if(!issue)return;
  const elements=[...new Set(issue.elements)];
  const id=`field-error-${++serial}`;
  const message=document.createElement('p');message.id=id;message.className='field-error';message.dataset.validationError='true';message.textContent=issue.message;
  const first=elements.find(el=>!el.disabled)??elements[0];
  if(first){const anchor=first.closest('.estimate-triple,.form-grid')??first.closest('label')??first;anchor.insertAdjacentElement('afterend',message);}
  for(const el of elements){el.setAttribute('aria-invalid','true');el.dataset.validationMark='true';el.setAttribute('aria-describedby',[(el.getAttribute('aria-describedby')??''),id].filter(Boolean).join(' '));}
  const text=document.createElement('span');text.textContent=issue.message;summary.append(text);
  if(first){const jump=document.createElement('button');jump.type='button';jump.className='error-jump';jump.textContent='Gå til feltet som må rettes ↑';jump.addEventListener('click',focusIssue);summary.append(jump);}
  if(focus)focusIssue();
 }
 function check(focus=true){attempted=true;const issue=findIssue();show(issue,focus);return !issue;}
 // Re-check after other input handlers finish, including changes that rebuild rows.
 function refresh(){if(!attempted||queued)return;queued=true;queueMicrotask(()=>{queued=false;if(attempted&&form.closest('dialog')?.open)show(findIssue(),false)});}
 form.addEventListener('input',refresh);form.addEventListener('change',refresh);form.addEventListener('editor-rows-rendered',refresh);
 return {check,reset(){attempted=false;current=null;clear();}};
}
