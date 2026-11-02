import type {Store} from '../db/store.ts';
import {hash} from '../db/store.ts';
export interface RemoteRecord {id:string;hash:string}
export interface MirrorAdapter {find(key:string):Promise<RemoteRecord|null>;upsert(key:string,payload:unknown,payloadHash:string):Promise<RemoteRecord>;capture?(key:string):Promise<Buffer>}
export class OutboxWorker {
  store:Store; adapter:MirrorAdapter; now:()=>number; random:()=>number;
  constructor(store:Store,adapter:MirrorAdapter,now=Date.now,random=Math.random){this.store=store;this.adapter=adapter;this.now=now;this.random=random;}
  recoverExpiredLeases():void{this.store.db.prepare("UPDATE sync_outbox SET state='pending',lease_until=NULL WHERE state='processing' AND lease_until<=?").run(new Date(this.now()).toISOString());}
  async runOne():Promise<'idle'|'done'|'retry'|'conflict'>{
    this.recoverExpiredLeases();const now=new Date(this.now()).toISOString();
    const row=this.store.tx(()=>{const item=this.store.db.prepare("SELECT j.* FROM sync_outbox j WHERE j.target!='PDF' AND j.state IN('pending','failed') AND j.next_retry<=? AND NOT EXISTS(SELECT 1 FROM sync_outbox older WHERE older.entity_id=j.entity_id AND older.target=j.target AND older.version<j.version AND older.state!='done') ORDER BY j.rowid LIMIT 1").get(now);if(!item)return null;this.store.db.prepare("UPDATE sync_outbox SET state='processing',attempts=attempts+1,lease_until=? WHERE id=?").run(new Date(this.now()+60000).toISOString(),item.id as string);return item;});
    if(!row)return 'idle';const key=`${row.target}:${row.entity_id}`;
    try{
      if(hash(row.payload as string)!==row.payload_hash)throw Error('Local outbox payload hash mismatch.');
      const parsed=JSON.parse(row.payload as string);const expected=String(row.target).startsWith('DRIVE_')?String(parsed.fileHash):String(row.payload_hash);const remote=await this.adapter.find(key);const previous=this.store.db.prepare('SELECT payload_hash FROM sync_remote_links WHERE entity_id=? AND target=? ORDER BY version DESC LIMIT 1').get(row.entity_id as string,row.target as string);
      if((!remote&&previous)||(remote&&remote.hash!==expected&&(!previous||remote.hash!==previous.payload_hash))){
        this.store.db.prepare("UPDATE sync_outbox SET state='conflict',error='Remote content changed; Owner review required.',lease_until=NULL WHERE id=?").run(row.id as string);return 'conflict';
      }
      const result=remote?.hash===expected?remote:await this.adapter.upsert(key,parsed,expected);
      if(result.hash!==expected)throw Error('Remote acknowledgement hash mismatch.');
      this.store.tx(()=>{this.store.db.prepare('INSERT INTO sync_remote_links VALUES(?,?,?,?,?) ON CONFLICT(entity_id,version,target) DO UPDATE SET remote_id=excluded.remote_id,payload_hash=excluded.payload_hash').run(row.entity_id as string,row.version as number,row.target as string,result.id,result.hash);this.store.db.prepare("UPDATE sync_outbox SET state='done',remote_id=?,error='',lease_until=NULL WHERE id=?").run(result.id,row.id as string);});return 'done';
    }catch{
      // Deliberately do not retain adapter exception text: URLs and credentials can occur in SDK errors.
      const delay=Math.min(3600000,1000*2**Math.min(12,(row.attempts as number)+1))+Math.floor(this.random()*1000);
      this.store.db.prepare("UPDATE sync_outbox SET state='failed',error='Sync unavailable. Check connection and credentials in Settings.',next_retry=?,lease_until=NULL WHERE id=?").run(new Date(this.now()+delay).toISOString(),row.id as string);return 'retry';
    }
  }
  async reconcile(options:{after?:string;limit?:number}={}):Promise<{missing:string[];changed:string[];errors:string[];checked:number;next:string|null}>{
    const missing:string[]=[],changed:string[]=[],errors:string[]=[];const limit=Math.max(1,Math.min(500,options.limit||100));
    const links=this.store.db.prepare("SELECT l.*,l.target||':'||l.entity_id source_key FROM sync_remote_links l WHERE l.version=(SELECT MAX(newer.version) FROM sync_remote_links newer WHERE newer.entity_id=l.entity_id AND newer.target=l.target) AND l.target||':'||l.entity_id>? ORDER BY source_key LIMIT ?").all(options.after||'',limit+1);
    for(const link of links.slice(0,limit)){const key=String(link.source_key);try{
      const remote=await this.adapter.find(key);let conflict=false;
      if(!remote){missing.push(key);conflict=true;}else if(remote.hash!==link.payload_hash){
        const pending=this.store.db.prepare("SELECT payload,payload_hash,target FROM sync_outbox WHERE entity_id=? AND target=? AND version>? AND state!='conflict' ORDER BY version DESC").all(link.entity_id as string,link.target as string,link.version as number);
        const authorized=pending.some(row=>String(row.target).startsWith('DRIVE_')?JSON.parse(row.payload as string).fileHash===remote.hash:row.payload_hash===remote.hash);
        if(!authorized){changed.push(key);conflict=true;}
      }
      if(conflict)this.store.db.prepare("UPDATE sync_outbox SET state='conflict',error='Periodic integrity check found missing or altered remote content; review recovery.',lease_until=NULL WHERE entity_id=? AND target=? AND version=? AND state='done'").run(link.entity_id as string,link.target as string,link.version as number);
    }catch{errors.push(key);}}
    return {missing,changed,errors,checked:Math.min(limit,links.length),next:links.length>limit?String(links[limit-1]!.source_key):null};
  }
}
