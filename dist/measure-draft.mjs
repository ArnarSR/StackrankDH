import {usesSegments,applySegments} from './segments.mjs';

// Dialogen redigerer bare deler av tiltaket. Segmentrader må overleve lagring,
// og avledede felt må fortsatt komme fra segmentene.
export function mergeMeasureDraft(original,fields,segments,standardValue){
 const draft={...structuredClone(original??{}),...fields};
 if(usesSegments(draft))applySegments([draft],segments,standardValue);
 else if(!draft.valueOverride)draft.value=standardValue;
 return draft;
}
