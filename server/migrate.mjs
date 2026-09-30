import './config.mjs';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createPool} from './database.mjs';

export async function migrate(pool){
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(7612, 1)");
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const directory=new URL('../db/migrations/',import.meta.url);
  for(const name of (await readdir(directory)).filter(n=>n.endsWith('.sql')).sort()){
   const sql=await readFile(new URL(name,directory),'utf8'),checksum=createHash('sha256').update(sql).digest('hex');
   const existing=await client.query('SELECT checksum FROM schema_migrations WHERE name=$1',[name]);
   if(existing.rows.length){if(existing.rows[0].checksum!==checksum)throw new Error(`Migreringen ${name} er endret etter kjøring.`);continue}
   await client.query(sql);
   await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[name,checksum]);
  }
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const url=process.env.MIGRATION_DATABASE_URL??process.env.DATABASE_URL;
 if(!url)throw new Error('Sett MIGRATION_DATABASE_URL eller DATABASE_URL.');
 const pool=createPool(url);
 try{await migrate(pool);console.log('Databaseskjemaet er oppdatert.')}finally{await pool.end()}
}
