try{process.loadEnvFile()}catch(e){if(e.code!=='ENOENT')throw e}

export function configFromEnv(env=process.env){
 const port=Number(env.PORT??4173),workspaceId=env.WORKSPACE_ID??'default';
 if(!Number.isInteger(port)||port<0||port>65535)throw new Error('PORT må være en gyldig port.');
 if(!/^[a-zA-Z0-9_-]{1,80}$/.test(workspaceId))throw new Error('Ugyldig WORKSPACE_ID.');
 if(!env.DATABASE_URL)throw new Error('Sett DATABASE_URL i .env. Bruk npm run start:local for lokal nettleserlagring.');
 return {port,workspaceId,databaseUrl:env.DATABASE_URL};
}
