import {existsSync,readFileSync} from 'node:fs';
import {Store,hash,canonical} from './store.ts';
import {randomUUID} from 'node:crypto';
import {D,dec,sum} from '../core/money.ts';
type Finding={severity:'critical'|'high'|'warning';kind:string;id?:string;message:string;impact:string;nextAction:string};
export function healthReport(s:Store,token:string){
 const actor=s.actor(token,'backup'),findings:Finding[]=[];
 const add=(severity:Finding['severity'],kind:string,message:string,impact:string,nextAction:string,id?:string)=>findings.push({severity,kind,message,impact,nextAction,id});
 try{s.verifyInternal();}catch(e){add('critical','integrity',(e as Error).message,'Issuance and recovery need investigation.','Preserve a copy; inspect a verified backup.');}
 for(const file of s.db.prepare('SELECT * FROM document_files').all()){
  if(!existsSync(String(file.path)))add('high','missing-pdf','Registered original PDF is missing.','Original print evidence unavailable.','Preview PDF recovery or restore a verified original.',String(file.document_id));
  else if(hash(readFileSync(String(file.path)))!==file.hash)add('high','pdf-hash','Registered PDF hash differs.','Original evidence may have been altered.','Preserve evidence and preview recovery.',String(file.document_id));
 }
 for(const row of s.db.prepare('SELECT id FROM documents WHERE id NOT IN(SELECT document_id FROM document_files)').all())add('warning','pdf-pending','PDF not registered.','Snapshot remains issued; print output awaits creation.','Preview retry of PDF jobs.',String(row.id));
 for(const row of s.db.prepare('SELECT type,fy,series,last_number FROM series').all()){
  const numbers=s.db.prepare('SELECT sequence FROM documents WHERE type=? AND fy=? AND series=? ORDER BY sequence').all(String(row.type),String(row.fy),String(row.series)).map(r=>Number(r.sequence));
  let expected=1;for(const actual of numbers){if(actual!==expected)add('high','number-gap',`Number gap ${expected}–${actual-1} in ${row.type}/${row.fy}/${row.series}.`,'Numbers must never be reused.','Record an explanation after evidence review.');expected=actual+1;}
  if(expected-1!==row.last_number)add('high','series-mismatch','Series counter differs from maximum issued sequence.','Future numbering may be affected.','Restore/reconcile with an Owner; never edit issued numbers.');
 }
 for(const row of s.db.prepare("SELECT id,state,error,lease_until,next_retry FROM sync_outbox WHERE state IN('failed','conflict','processing')").all()){
  if(row.state==='processing'&&row.lease_until&&String(row.lease_until)>new Date().toISOString())continue;
  add(row.state==='conflict'?'high':'warning','sync',row.state==='conflict'?'Remote conflict requires review.':row.state==='processing'?'Worker lease expired.':'A queued job failed.','Cloud visibility or PDF output may be stale.',row.state==='conflict'?'Review remote evidence; recover explicitly.':'Preview queued-job retry.',String(row.id));
 }
 for(const row of s.db.prepare('SELECT * FROM attachments').all()){const path=s.safeFile(String(row.path));if(!existsSync(path)||hash(readFileSync(path))!==row.hash)add('high','attachment','Purchase attachment missing or altered.','Original purchase evidence unavailable.','Restore from the independent archive; preserve changed bytes.',String(row.id));}
 const last=s.db.prepare('SELECT * FROM backup_catalog ORDER BY at DESC LIMIT 1').get();if(!last||Date.now()-Date.parse(String(last.at))>86400000)add('warning','backup-age','No backup created within 24 hours.','Recovery point may be old.','Create a backup and verify the independent destination.');
 if(last&&(!existsSync(String(last.path))||hash(readFileSync(String(last.path)))!==last.hash))add('high','backup-file','Latest catalogued backup is missing or altered.','Restore reliability is uncertain.','Create a new backup; retain surviving copies.');
 const independent=s.db.prepare("SELECT payload FROM app_settings WHERE key='backupDestination'").get();if(!independent)add('warning','independent-backup','Independent destination not configured.','Local disk loss can affect all local copies.','Choose an independent backup location.');
 for(const product of s.products().filter(p=>p.tracked)){const balance=s.stock(product.id);if(dec(balance.quantity,true).lt(0))add('warning','approved-negative-stock','Product has an outstanding negative-stock exception.','Receipt and cost variance must be reconciled.','Receive actual stock and review variance.',product.id);}
 const remote=s.db.prepare("SELECT at,payload FROM diagnostic_runs WHERE json_extract(payload,'$.kind')='remote-integrity' ORDER BY at DESC LIMIT 1").get();
 const google=s.db.prepare("SELECT payload FROM app_settings WHERE key='googleConnection'").get();if(google&&JSON.parse(String(google.payload)).enabled&&(!remote||Date.now()-Date.parse(String(remote.at))>86400000))add('warning','remote-stale','Remote integrity check is older than 24 hours or absent.','Remote evidence has not recently been reconciled.','Run Google integrity check; continue pages until complete.');
 const result={kind:'local-health',checkedAt:new Date().toISOString(),schema:Number(s.db.prepare('PRAGMA user_version').get()!.user_version),findings,productionBlocked:true,implementationUntested:true};s.db.prepare('INSERT INTO diagnostic_runs VALUES(?,?,?,?)').run(randomUUID(),canonical(result),actor.id,result.checkedAt);return result;
}
