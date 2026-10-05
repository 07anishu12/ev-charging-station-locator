import { config } from 'dotenv';
config({path:['.env.local','.env'],quiet:true});
import { mkdir,writeFile } from 'node:fs/promises';
import { sql } from 'drizzle-orm';
import { getDb,closeDb } from '@fastcharger/database';
import { runScheduled } from '../scheduler';
async function run() {
  const db=getDb();
  // One scheduler at a time, even if cron invocations overlap. Hold a dedicated transaction connection.
  const report=await db.transaction(async tx=> {
    const lock=await tx.execute(sql`SELECT pg_try_advisory_xact_lock(117118) AS acquired`);
    if(!lock.rows[0].acquired)return [{status:'SKIPPED',reason:'A scheduled run is already active'}];
    return [...await runScheduled(db,{force:process.argv.includes('--now')}),...await runScheduled(db,{statusOnly:true,force:process.argv.includes('--now')})];
  });
  await mkdir('.ingestion/reports',{recursive:true});await writeFile(`.ingestion/reports/scheduled-${Date.now()}.json`,JSON.stringify(report,null,2),{mode:0o600});
  console.log(JSON.stringify({completedAt:new Date().toISOString(),report},null,2));
  if(report.some(r=>(r as {status?:string}).status==='FAILED'))process.exitCode=1;
}
run().catch(()=>{console.error('Scheduled worker failed; previous canonical data retained.');process.exitCode=1;}).finally(closeDb);
