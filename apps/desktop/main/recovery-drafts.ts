import {safeStorage} from 'electron';
import {existsSync,readdirSync,readFileSync,writeFileSync,renameSync,mkdirSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {hash,Store} from '../../../packages/db/store.ts';
import {validateDraft} from '../../../packages/core/validation.ts';
export class DraftRecovery {
 constructor(readonly folder:string,readonly s:Store){mkdirSync(folder,{recursive:true});}
 private file(actor:string){return join(this.folder,hash({root:this.s.root,actor})+'.bin');}
 save(actor:string,input:any,demoSessionId=''){if(!actor)throw Error('Sign in before creating a recovery copy.');if(!safeStorage.isEncryptionAvailable())throw Error('Windows protected recovery storage is unavailable.');if(!input||Object.keys(input).some(k=>!['draft','pendingIssue','workflowStep','previewEditing','exampleMode'].includes(k))||JSON.stringify(input).length>2500000)throw Error('Recovery copy is too large.');validateDraft(input.draft,true);if(input.pendingIssue&&(input.pendingIssue.draftId!==input.draft.id||!Number.isSafeInteger(input.pendingIssue.expectedVersion)||typeof input.pendingIssue.idempotencyKey!=='string'||input.pendingIssue.idempotencyKey.length>100))throw Error('Invalid pending issue recovery.');const bytes=safeStorage.encryptString(JSON.stringify({...input,version:1,root:this.s.root,actor,savedAt:new Date().toISOString(),demoSessionId})),file=this.file(actor),stage=file+'.tmp';writeFileSync(stage,bytes,{mode:0o600});renameSync(stage,file);return {saved:true};}
 load(token:string){const actor=this.s.actor(token,'draft'),file=this.file(actor.id);if(!existsSync(file))return null;const data=JSON.parse(safeStorage.decryptString(readFileSync(file)));if(data.root!==this.s.root||data.actor!==actor.id)throw Error('Recovery copy belongs to another workspace or actor.');validateDraft(data.draft,true);return data;}
 clearDemo(sessionId:string){for(const name of readdirSync(this.folder)){if(!/^[a-f0-9]{64}\.bin$/.test(name))continue;const file=join(this.folder,name);let data;try{data=JSON.parse(safeStorage.decryptString(readFileSync(file)));}catch{continue;}if(data.root===this.s.root&&data.demoSessionId===sessionId)unlinkSync(file);}}
 clear(token:string){const actor=this.s.actor(token,'draft'),file=this.file(actor.id);if(existsSync(file))unlinkSync(file);return true;}
}
