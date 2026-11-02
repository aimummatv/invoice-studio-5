import {randomUUID,randomBytes,scryptSync,createCipheriv,createDecipheriv} from 'node:crypto';
import {readdirSync,readFileSync,existsSync,mkdirSync,writeFileSync,lstatSync,openSync,fsyncSync,closeSync,renameSync} from 'node:fs';
import {join,relative,resolve,isAbsolute} from 'node:path';
import {Store,canonical,hash} from '../db/store.ts';
import {checkZip} from './workbooks.ts';
import {Reporting} from '../db/reporting.ts';
import {Operations} from '../db/operations.ts';
async function zip(){const m=await import('jszip');return new m.default();}
const MAX=512*1024*1024;
function walk(root:string):string[]{if(!existsSync(root))return [];return readdirSync(root,{withFileTypes:true}).flatMap(x=>x.isSymbolicLink()?[]:x.isDirectory()?walk(join(root,x.name)):[join(root,x.name)]);}
export function writeExternalAtomic(filename:string,bytes:Buffer){if(existsSync(filename))throw Error('Select a new filename to preserve existing data.');const stage=filename+'.'+randomUUID()+'.tmp';const fd=openSync(stage,'wx',0o600);try{writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}renameSync(stage,filename);return {path:filename,hash:hash(bytes)};}
export async function backupArchive(s:Store,token:string,password:string):Promise<Buffer>{
 s.actor(token,'backup');if(password.length<12||password.length>256)throw Error('Use a backup passphrase of 12–256 characters. Keep a separate recovery copy of it.');const snapshot=await s.backup(token,'archive');const pack=await zip();const entries:{name:string;sha256:string;size:number}[]=[];let size=0;
 const add=(name:string,bytes:Buffer)=>{size+=bytes.length;if(size>MAX)throw Error('Archive exceeds 512 MB; configure a larger-capacity backup workflow.');pack.file(name,bytes);entries.push({name,sha256:hash(bytes),size:bytes.length});};
 add('Data/invoice-studio.sqlite',readFileSync(snapshot.path));for(const folder of ['Bills','Purchases','Attachments','Legacy','Imports','Exports','CA-Packs'])for(const file of walk(join(s.root,folder))){if(lstatSync(file).isSymbolicLink())continue;add(relative(s.root,file).split('\\').join('/'),readFileSync(file));}
 pack.file('manifest.json',canonical({format:'IS4-BACKUP-1',mode:'TEST',createdAt:new Date().toISOString(),sourceRoot:s.root,entries}));const plaintext=await pack.generateAsync({type:'nodebuffer',compression:'DEFLATE'});const salt=randomBytes(16),iv=randomBytes(12),key=scryptSync(password,salt,32);const cipher=createCipheriv('aes-256-gcm',key,iv);const encrypted=Buffer.concat([cipher.update(plaintext),cipher.final()]);return Buffer.concat([Buffer.from('IS4B1'),salt,iv,cipher.getAuthTag(),encrypted]);
}
export async function restoreArchive(bytes:Buffer,password:string,target:string){
 if(bytes.length>MAX||bytes.length<50||bytes.subarray(0,5).toString()!=='IS4B1')throw Error('Not a supported encrypted archive.');if(existsSync(target))throw Error('Restore requires a new destination that does not already exist.');const salt=bytes.subarray(5,21),iv=bytes.subarray(21,33),tag=bytes.subarray(33,49),key=scryptSync(password,salt,32);let plaintext:Buffer;try{const cipher=createDecipheriv('aes-256-gcm',key,iv);cipher.setAuthTag(tag);plaintext=Buffer.concat([cipher.update(bytes.subarray(49)),cipher.final()]);}catch{throw Error('Passphrase incorrect or encrypted archive altered.');}
 checkZip(plaintext,MAX,MAX,60000);const pack=await zip();await pack.loadAsync(plaintext);const manifestFile=pack.file('manifest.json');if(!manifestFile)throw Error('Backup manifest missing.');const manifestText=await manifestFile.async('string');const manifest=JSON.parse(manifestText) as {format:string;sourceRoot:string;entries:{name:string;sha256:string;size:number}[]};if(manifest.format!=='IS4-BACKUP-1'||manifest.entries.length>100000)throw Error('Unsupported backup manifest.');let expanded=0;const extracted=new Map<string,Buffer>();
 for(const e of manifest.entries){if(isAbsolute(e.name)||e.name.includes('\\')||e.name.split('/').some(p=>p==='..')||e.size<0||e.size>MAX)throw Error('Unsafe archive path.');expanded+=e.size;if(expanded>MAX)throw Error('Expanded backup too large.');const item=pack.file(e.name);if(!item)throw Error('Backup file missing: '+e.name);const raw=await item.async('nodebuffer');if(raw.length!==e.size||hash(raw)!==e.sha256)throw Error('Backup checksum mismatch: '+e.name);extracted.set(e.name,raw);}
 if(!extracted.has('Data/invoice-studio.sqlite'))throw Error('Backup database missing.');mkdirSync(target,{recursive:true,mode:0o700});for(const [name,data]of extracted){const dest=resolve(target,name);if(!dest.startsWith(resolve(target)+'/')&&!dest.startsWith(resolve(target)+'\\'))throw Error('Unsafe restore path.');mkdirSync(resolve(dest,'..'),{recursive:true,mode:0o700});writeFileSync(dest,data,{mode:0o600,flag:'wx'});}
 const restored=new Store(target,{mustExist:true});try{restored.tx(()=>{for(const f of restored.db.prepare('SELECT document_id,path FROM document_files').all()){const rel=relative(manifest.sourceRoot,f.path as string);if(rel.startsWith('..')||isAbsolute(rel))throw Error('Manifest contains a PDF outside the archived data root.');const path=restored.safeFile(rel);restored.db.prepare('UPDATE document_files SET path=? WHERE document_id=?').run(path,f.document_id as string);}restored.audit({id:'restore-wizard',name:'TEST restore',role:'Owner'},'archive-restored','business',{sourceManifestHash:hash(manifestText),files:extracted.size});});for(const file of restored.db.prepare('SELECT path,hash FROM document_files').all()){if(!existsSync(file.path as string)||hash(readFileSync(file.path as string))!==file.hash)throw Error('Restored PDF missing or hash mismatch.');}for(const file of restored.db.prepare('SELECT path,hash FROM attachments').all()){const path=restored.safeFile(file.path as string);if(!existsSync(path)||hash(readFileSync(path))!==file.hash)throw Error('Restored attachment missing or hash mismatch.');}return {root:target,files:extracted.size,...restored.verifyInternal()};}finally{restored.close();}
}
export async function caPack(s:Store,token:string,period:string):Promise<Buffer>{
 s.actor(token,'export');s.actor(token,'tax');s.actor(token,'purchase');s.actor(token,'stock');
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))throw Error('Choose a valid review month.');
 const end=new Date(period+'-01T12:00:00Z');end.setUTCMonth(end.getUTCMonth()+1);end.setUTCDate(0);
 const filter={from:period+'-01',to:end.toISOString().slice(0,10),asOf:end.toISOString().slice(0,10)};
 const pack=await zip();const o=new Operations(s),reports=new Reporting(s);
 // Read all financial sections in one synchronous SQLite transaction before ZIP generation.
 const records=s.tx(()=>{
  const documents=s.db.prepare('SELECT id FROM documents WHERE date>=? AND date<=? ORDER BY date,number').all(filter.from,filter.to).map(row=>{const document=s.document(row.id as string)!;return {...document,cancelled:s.cancelled(document.id)};});
  const imports=s.db.prepare('SELECT * FROM gstr2b_imports WHERE period=? ORDER BY at,id').all(period);
  const result:Record<string,unknown>={
   'README.json':{format:'IS4-CA-REVIEW-2',mode:'TEST',period,filter,sourceVersion:'4.0.0-dev.5',notice:'Unapproved review pack. Not a filing payload or proof of ITC eligibility. Monetary integer fields are paise. Cancelled documents remain visible as evidence; GST summaries exclude them. Historical reports reflect the currently revised books.',generatedAt:new Date().toISOString()},
   'gst-summary.json':o.gst(token,period),'sales.json':documents,
   'purchases.json':s.db.prepare('SELECT * FROM purchase_documents WHERE date>=? AND date<=? ORDER BY date,id').all(filter.from,filter.to),
   'purchase-returns.json':s.db.prepare('SELECT * FROM purchase_returns WHERE date>=? AND date<=? ORDER BY date,id').all(filter.from,filter.to),
   'receipts.json':s.db.prepare('SELECT p.*,EXISTS(SELECT 1 FROM payment_events e WHERE e.payment_id=p.id) reversed FROM payments p WHERE p.date>=? AND p.date<=? ORDER BY p.date,p.id').all(filter.from,filter.to),
   'adjustments.json':s.db.prepare('SELECT * FROM financial_adjustments WHERE date>=? AND date<=? ORDER BY date,id').all(filter.from,filter.to),
   'hsn.json':reports.hsn(token,filter),'collections.json':reports.collections(token,filter),
   'book-vs-declared-variance.json':o.gst(token,period).variance,'amendment-proposals.json':o.gst(token,period).amendments,'purchase-tax-itc.json':reports.purchaseTax(token,filter),'customer-aging.json':o.view(token,'aging',filter),'supplier-aging.json':reports.supplierAging(token,filter),
   '2b-imports.json':imports,
   '2b-reviews.json':s.db.prepare('SELECT r.* FROM gstr2b_reviews r JOIN gstr2b_imports i ON i.id=r.import_id WHERE i.period=? ORDER BY r.at,r.id').all(period),
   'stock.json':reports.stock(token,filter),'sales-margin.json':o.view(token,'salesReports',filter),
   'exceptions.json':o.view(token,'diagnostics')
  };
  return result;
 });
 const checks:Record<string,string>={};for(const [name,value]of Object.entries(records)){const body=canonical(value);pack.file(name,body);checks[name]=hash(body);}
 pack.file('checksums.json',canonical(checks));return pack.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
}
