import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {DemoSession} from '../db/demo.ts';
import {Store,canonical,hash} from '../db/store.ts';
import {fixture,draft} from './fixtures.ts';

function logical(s:Store){const tables=s.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();return hash(tables.map(r=>[r.name,s.db.prepare(`SELECT * FROM "${r.name}" ORDER BY rowid`).all()]));}
function cleanup(f:ReturnType<typeof fixture>){f.cleanup();const folder=resolve(f.root+'.demo-sessions');if(folder!==resolve(f.root)+'.demo-sessions')throw Error('Unsafe test cleanup.');rmSync(folder,{recursive:true,force:true});}

test('demo checkpoint restores all original rows, settings, numbering and managed files exactly',async t=>{
 const f=fixture();t.after(()=>cleanup(f));const old=f.s.saveDraft(f.token,draft());f.s.issue(f.token,{draftId:old.id,expectedVersion:old.version,idempotencyKey:'original'});const saved=f.s.saveDraft(f.token,draft());const original=f.s.atomicFile('Bills/original.txt',Buffer.from('original file'));const baseline=logical(f.s),profile=canonical(f.s.profile());
 const demo=new DemoSession(f.root);await demo.begin(f.s,f.token);assert.equal(f.s.register(f.token).length,13);assert.equal(f.s.db.prepare('SELECT COUNT(*) n FROM drafts WHERE id NOT IN(SELECT id FROM documents)').get()!.n,4);assert.equal(f.s.profile().series,'DM');assert.match(f.s.profile().demoSessionId!,/^[a-f0-9-]+$/);
 assert.throws(()=>demo.guard('saveDraft',{draft:saved}),/read-only/);assert.throws(()=>demo.guard('saveCustomer',{customer:f.customer}),/read-only/);assert.throws(()=>demo.guard('google',{action:'sync'}),/paused/);assert.throws(()=>demo.guard('recordPayment',{payment:{id:'new',partyId:f.customer.id}}),/read-only/);
 const pdf=f.s.atomicFile(demo.folder('Exports')+'/sample.pdf',Buffer.from('%PDF synthetic'));demo.recordFile(pdf.path);assert.throws(()=>demo.recordFile(original.path),/session folder/);
 const reopened=new DemoSession(f.root);assert.equal(reopened.active,true);f.s.close();reopened.restore();assert.equal(existsSync(pdf.path),false);assert.equal(readFileSync(original.path,'utf8'),'original file');assert.equal(new DemoSession(f.root).active,false);
 const s=new Store(f.root,{mustExist:true});try{assert.equal(logical(s),baseline);assert.equal(canonical(s.profile()),profile);assert.equal(s.document(old.id)!.number,'T4/TI/26-27/0001');assert.equal(s.draft(saved.id)!.version,1);}finally{s.close();}
});

test('demo seed failure rolls back its transaction and recovers on next startup',async t=>{
 const f=fixture();t.after(()=>cleanup(f));const baseline=logical(f.s);f.s.fault=phase=>{if(phase==='after-number')throw Error('Injected demo failure');};const demo=new DemoSession(f.root);await assert.rejects(()=>demo.begin(f.s,f.token),/Restart the app/);assert.equal(f.s.db.prepare('SELECT COUNT(*) n FROM documents').get()!.n,0);f.s.close();const recovered=new DemoSession(f.root);recovered.recoverIfNeeded();const s=new Store(f.root,{mustExist:true});try{assert.equal(logical(s),baseline);}finally{s.close();}
});

test('demo loading is not repeatable while active and protected references cannot cross into new records',async t=>{
 const f=fixture();t.after(()=>cleanup(f));const original=f.s.saveDraft(f.token,draft());const demo=new DemoSession(f.root);await demo.begin(f.s,f.token);await assert.rejects(()=>demo.begin(f.s,f.token),/already exists/);
 assert.throws(()=>demo.guard('saveDraft',{draft:{id:'new',originalId:original.id,customerId:f.customer.id,lines:[]}}),/read-only/);assert.throws(()=>demo.guard('operations',{action:'savePaymentSettings',input:{profile:{...f.s.profile(),series:'MR'}}}),/DM number/);assert.throws(()=>demo.guard('files',{action:'openWhatsApp'}),/paused/);f.s.close();demo.restore();
});

test('corrupt checkpoint or externally changed original file blocks cleanup without replacing records',async t=>{
 const f=fixture();t.after(()=>cleanup(f));const original=f.s.atomicFile('Bills/original.txt',Buffer.from('original'));const demo=new DemoSession(f.root);await demo.begin(f.s,f.token);f.s.close();const checkpoint=join(demo.sessionDirectory,'checkpoint.sqlite'),bytes=readFileSync(checkpoint);writeFileSync(checkpoint,Buffer.concat([bytes,Buffer.from('corrupt')]));assert.throws(()=>demo.restore(),/checksum mismatch/);writeFileSync(checkpoint,bytes);writeFileSync(original.path,'external change');assert.throws(()=>demo.restore(),/changed outside/);const s=new Store(f.root,{mustExist:true});try{assert.equal(s.db.prepare('SELECT COUNT(*) n FROM documents').get()!.n,12);}finally{s.close();}writeFileSync(original.path,'original');demo.restore();
});

test('interrupted cleanup resumes from the persisted restoring state',async t=>{
 const f=fixture();t.after(()=>cleanup(f));const baseline=logical(f.s);const demo=new DemoSession(f.root);await demo.begin(f.s,f.token);demo.markRestoring();f.s.close();new DemoSession(f.root).recoverIfNeeded();const s=new Store(f.root,{mustExist:true});try{assert.equal(logical(s),baseline);}finally{s.close();}
});

test('write-ahead file manifest removes a PDF created just before a process interruption',async t=>{
 const f=fixture();t.after(()=>cleanup(f));const demo=new DemoSession(f.root);await demo.begin(f.s,f.token);const relativeName=demo.folder('Exports')+'/interrupted.pdf',bytes=Buffer.from('%PDF interrupted export');demo.planFile(relativeName,hash(bytes));const file=f.s.atomicFile(relativeName,bytes);const directory=demo.sessionDirectory;f.s.close();new DemoSession(f.root).restore();assert.equal(existsSync(file.path),false);const manifest=JSON.parse(readFileSync(join(directory,'manifest.json'),'utf8'));assert.deepEqual(manifest.retired,[]);assert.equal(manifest.state,'completed');
});
