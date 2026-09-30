import pg from 'pg';
export function createPool(connectionString){
 const pool=new pg.Pool({connectionString,max:5,idleTimeoutMillis:30000,connectionTimeoutMillis:3000,statement_timeout:5000,application_name:'stackrankdh'});
 pool.on('error',()=>console.error('En ledig databasetilkobling ble brutt.'));
 return pool;
}
