import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {views} from '../dist/router.mjs';

const dist=fileURLToPath(new URL('../dist/',import.meta.url));
test('Smoke: alle lokale modulimporter og statiske inngangsfiler finnes',()=>{
 for(const file of readdirSync(dist).filter(f=>/\.(mjs|js|html)$/.test(f))){
  const content=readFileSync(resolve(dist,file),'utf8');
  const links=file.endsWith('.html')?[...content.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(m=>m[1]):[...content.matchAll(/(?:from\s*|import\s*)["'](\.\.?\/[^"']+)["']/g)].map(m=>m[1]);
  for(const link of links){
   if(/^(?:https?:|#|data:)/.test(link))continue;
   assert.ok(existsSync(resolve(dirname(resolve(dist,file)),link.split(/[?#]/)[0])),`${file} peker på manglende ${link}`);
  }
 }
});
test('Smoke: alle sidevisninger har en unik seksjon i hovedsiden',()=>{
 const html=readFileSync(resolve(dist,'index.html'),'utf8');
 for(const view of Object.values(views))assert.equal([...html.matchAll(new RegExp(`id="${view.section}"`,'g'))].length,1,view.section);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length,'dupliserte HTML-id-er');
});
