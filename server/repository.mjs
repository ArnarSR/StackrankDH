export class ConflictError extends Error {constructor(){super('Arbeidsflaten er endret et annet sted. Eksporter utkastet ditt og last inn siden på nytt.');this.status=409}}
export function createRepository(pool,workspaceId){
 const record=row=>row?{revision:row.revision,version:row.model_version,workspace:row.is_reset?null:row.payload,savedAt:row.updated_at}:{revision:0,workspace:null};
 return {
  async read(kind){const r=await pool.query('SELECT * FROM workspace_documents WHERE workspace_id=$1 AND kind=$2',[workspaceId,kind]);return record(r.rows[0])},
  async write(kind,version,payload,expectedRevision,operation='save'){
   const client=await pool.connect();
   try{
    await client.query('BEGIN');
    await client.query('INSERT INTO workspaces(id) VALUES($1) ON CONFLICT DO NOTHING',[workspaceId]);
    const args=[workspaceId,kind,version,JSON.stringify(payload),operation==='reset'];
    const result=expectedRevision===0
     ?await client.query('INSERT INTO workspace_documents(workspace_id,kind,model_version,revision,payload,is_reset) VALUES($1,$2,$3,1,$4,$5) ON CONFLICT DO NOTHING RETURNING *',args)
     :await client.query('UPDATE workspace_documents SET model_version=$3,revision=revision+1,payload=$4,is_reset=$5,updated_at=now() WHERE workspace_id=$1 AND kind=$2 AND revision=$6 RETURNING *',[...args,expectedRevision]);
    const row=result.rows[0];if(!row)throw new ConflictError();
    await client.query('INSERT INTO document_revisions(workspace_id,kind,revision,model_version,payload,operation) VALUES($1,$2,$3,$4,$5,$6)',[workspaceId,kind,row.revision,version,JSON.stringify(payload),operation]);
    await client.query('COMMIT');return record(row);
   }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  },
  async history(kind){const r=await pool.query('SELECT revision,model_version AS version,operation,created_at AS "savedAt" FROM document_revisions WHERE workspace_id=$1 AND kind=$2 ORDER BY revision DESC LIMIT 100',[workspaceId,kind]);return r.rows},
  async historical(kind,revision){const r=await pool.query('SELECT revision,model_version AS version,payload AS workspace,operation,created_at AS "savedAt" FROM document_revisions WHERE workspace_id=$1 AND kind=$2 AND revision=$3',[workspaceId,kind,revision]);return r.rows[0]??null}
 };
}
