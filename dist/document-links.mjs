export function parseDocumentLinks(text='') {
 const links=[];
 for(const line of text.split('\n').map(s=>s.trim()).filter(Boolean)) {
  const separator=line.indexOf('|');const title=separator<0?line:line.slice(0,separator).trim();const raw=separator<0?line:line.slice(separator+1).trim();
  let url;try{url=new URL(raw);}catch{return {links:[],error:`Ugyldig dokumentlenke: «${line}». Bruk Tittel | https://…`};}
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)return {links:[],error:'Dokumentlenker må bruke http eller https og kan ikke inneholde brukernavn eller passord.'};
  links.push({title:title||url.hostname,url:url.href});
 }
 return {links,error:''};
}
