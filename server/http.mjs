import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';
import {validateDocument,documentVersion} from '../dist/workspace-schema.mjs';
const dist=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value))};
function fail(status,message){return Object.assign(new Error(message),{status})}
async function body(req){
 if(!req.headers['content-type']?.startsWith('application/json'))throw fail(415,'Bruk application/json.');
 if(Number(req.headers['content-length'])>2*1024*1024)throw fail(413,'Arbeidsflaten er større enn 2 MB.');
 let size=0,chunks=[];
 for await(const chunk of req){size+=chunk.length;if(size>2*1024*1024)throw fail(413,'Arbeidsflaten er større enn 2 MB.');chunks.push(chunk)}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw fail(400,'Ugyldig JSON.')}
}
export function createAppServer({repository,pool,workspaceId}){
 return createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  try{
   // Loopback og Host-kontroll avgrenser denne utgaven til lokal utvikling.
   const host=req.headers.host??'';
   if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))throw fail(403,'Ugyldig vert.');
   if(req.headers.origin&&req.headers.origin!==`http://${host}`)throw fail(403,'Forespørselen må komme fra samme adresse som appen.');
   if(req.headers['sec-fetch-site']==='cross-site')throw fail(403,'Forespørselen må komme fra appen.');
   const url=new URL(req.url,`http://${host}`),path=url.pathname;
   if(path==='/storage-config.json'&&req.method==='GET')return json(res,200,{mode:'sql',workspaceId});
   if(path==='/api/health'&&req.method==='GET'){await pool.query('SELECT 1');return json(res,200,{status:'ok',storage:'postgresql'})}
   const match=path.match(/^\/api\/documents\/(portfolio|lab)(?:\/(history)(?:\/(\d+))?)?$/);
   if(match){
    const [,kind,history,revision]=match;
    if(req.method==='GET'){
     if(history){const value=revision?await repository.historical(kind,Number(revision)):await repository.history(kind);return json(res,value?200:404,value??{error:'Revisjonen finnes ikke.'})}
     return json(res,200,await repository.read(kind));
    }
    if(!history&&['PUT','DELETE'].includes(req.method)){
     const input=await body(req);
     if(!input||!Number.isInteger(input.expectedRevision)||input.expectedRevision<0||input.expectedRevision>=2147483647)throw fail(400,'expectedRevision må være et gyldig revisjonsnummer.');
     if(req.method==='DELETE')return json(res,200,await repository.write(kind,documentVersion(kind),{},input.expectedRevision,'reset'));
     const error=validateDocument(kind,input.version,input.workspace);if(error)throw fail(422,error);
     return json(res,200,await repository.write(kind,input.version,input.workspace,input.expectedRevision));
    }
    throw fail(405,'Metoden er ikke støttet.');
   }
   if(path.startsWith('/api/'))throw fail(404,'Ukjent API-adresse.');
   if(!['GET','HEAD'].includes(req.method))throw fail(405,'Metoden er ikke støttet.');
   let decoded;try{decoded=decodeURIComponent(path)}catch{throw fail(400,'Ugyldig adresse.')}
   const file=resolve(dist,'.'+(decoded==='/'?'/index.html':decoded));
   if(!file.startsWith(dist+sep)||decoded.split('/').some(s=>s.startsWith('.'))||!types[extname(file)])throw fail(404,'Filen finnes ikke.');
   const contents=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]});res.end(req.method==='HEAD'?undefined:contents);
  }catch(e){
   const status=e.status??(['ENOENT','EISDIR'].includes(e.code)?404:503);
   if(!res.headersSent)json(res,status,{error:status===503?'Databasen eller serveren er utilgjengelig. Utkastet er ikke lagret.':e.message});else res.end();
  }
 });
}
