import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync,readdirSync,lstatSync} from 'node:fs';
import {join,basename} from 'node:path';
import {hash} from '../db/store.ts';
import {D,sum,validDate} from '../core/money.ts';
import {businessDate} from '../core/model.ts';
type Row=Record<string,unknown>;
const types:Record<string,string>={'TAX INVOICE':'TAX_INVOICE','BILL OF SUPPLY':'BILL_OF_SUPPLY','PROFORMA INVOICE':'PROFORMA','PROFORMA':'PROFORMA','DELIVERY CHALLAN':'CHALLAN','ADVANCE RECEIPT':'ADVANCE_RECEIPT','RECEIPT VOUCHER':'ADVANCE_RECEIPT','CREDIT NOTE':'CREDIT_NOTE','DEBIT NOTE':'DEBIT_NOTE'};
export const legacyId=(sourceHash:string,id:unknown)=>'v3-'+sourceHash.slice(0,12)+'-'+hash(String(id)).slice(0,24);
function pdfFiles(root:string):string[]{let count=0;const walk=(dir:string):string[]=>{if(!existsSync(dir))return [];return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{if(++count>20000)throw Error('Select a smaller PDF archive folder (20,000 entries maximum).');const file=join(dir,entry.name);if(entry.isSymbolicLink()||lstatSync(file).isSymbolicLink())return [];return entry.isDirectory()?walk(file):entry.name.toLowerCase().endsWith('.pdf')?[file]:[];});};return walk(root);}
export function auditV3Copy(filename:string,options:{cutoverDate?:string;pdfFolder?:string}={}){
 if(!existsSync(filename)||existsSync(filename+'-wal'))throw Error('Use a consistent, closed v3 database copy, without an active WAL.');
 const before=hash(readFileSync(filename)),db=new DatabaseSync(filename,{readOnly:true}),cutoverDate=options.cutoverDate||businessDate();if(!validDate(cutoverDate)){db.close();throw Error('Enter a valid cutover date.');}
 try{
  db.exec('PRAGMA query_only=ON');const schema=db.prepare('PRAGMA user_version').get()!.user_version;if(schema!==1)throw Error('Unknown v3 schema; mapping review required.');if(db.prepare('PRAGMA integrity_check').get()!.integrity_check!=='ok')throw Error('Source copy corrupt.');
  const mismatches:string[]=[],warnings:string[]=[];if(db.prepare('PRAGMA foreign_key_check').all().length)mismatches.push('Source contains orphaned references.');
  const tables=['business_profiles','settings','parties','products','buyer_prices','tax_rules','appearance_presets','documents','document_lines','tax_breakdowns','number_series','payments','payment_allocations','stock_movements','product_batches','legacy_records'] as const;
  const inventory=tables.map(table=>({table,count:Number(db.prepare(`SELECT COUNT(*) n FROM ${table}`).get()!.n),fields:db.prepare(`PRAGMA table_info(${table})`).all().map(row=>({name:row.name,type:row.type,required:row.notnull}))}));
  const rows=db.prepare('SELECT * FROM documents ORDER BY date,id').all();const payments=db.prepare('SELECT * FROM payments ORDER BY date,id').all();const allocations=db.prepare('SELECT * FROM payment_allocations').all();
  const documents=rows.filter(row=>!!row.snapshot).map(row=>{
   if(hash(row.snapshot as string)!==row.snapshot_hash)mismatches.push('Snapshot hash mismatch: '+row.id);
   const snapshot=JSON.parse(row.snapshot as string),totals=snapshot.totals||{};
   for(const key of ['total','taxable','cgst','sgst','igst','cess'])if(!Number.isSafeInteger(totals[key]??0))mismatches.push('Invalid '+key+': '+row.id);
   const mappedType=types[String(row.document_type)];if(!mappedType)mismatches.push('Unmapped document type: '+row.document_type);
   const validEvidence=hash(String(row.snapshot))===row.snapshot_hash&&['total','taxable','cgst','sgst','igst','cess'].every(key=>Number.isSafeInteger(totals[key]??0));return {validEvidence,id:String(row.id),number:String(row.invoice_number||''),type:String(row.document_type),mappedType:mappedType||null,status:row.status,date:String(row.date),partyId:String(row.party_id||snapshot.document?.retailerId||''),originalId:String(snapshot.document?.originalDocumentId||''),total:Number(totals.total||0),taxable:Number(totals.taxable||0),cgst:Number(totals.cgst||0),sgst:Number(totals.sgst||0),igst:Number(totals.igst||0),cess:Number(totals.cess||0),hash:String(row.snapshot_hash)};
  });
  const active=documents.filter(d=>d.validEvidence&&d.status==='finalised'&&d.date<cutoverDate);
  const receipts=payments.filter(p=>!p.voided&&String(p.date)<cutoverDate);
  const validAllocations=allocations.filter(a=>receipts.some(p=>p.id===a.payment_id));
  for(const p of receipts)if(sum(validAllocations.filter(a=>a.payment_id===p.id).map(a=>Number(a.amount)))>Number(p.amount))mismatches.push('Payment overallocated: '+p.id);
  const balances=active.filter(d=>['TAX_INVOICE','BILL_OF_SUPPLY','DEBIT_NOTE'].includes(d.mappedType||'')).map(d=>{const paid=sum(validAllocations.filter(a=>a.document_id===d.id).map(a=>Number(a.amount))),credited=sum(active.filter(c=>c.mappedType==='CREDIT_NOTE'&&c.originalId===d.id).map(c=>c.total));return {documentId:d.id,number:d.number,partyId:d.partyId,total:d.total,allocated:paid,credited,outstanding:sum([d.total,-paid,-credited])};});
  const parties=db.prepare('SELECT * FROM parties ORDER BY id').all().map(row=>{const payload=JSON.parse(row.payload as string),sales=active.filter(d=>d.partyId===row.id&&['TAX_INVOICE','BILL_OF_SUPPLY','DEBIT_NOTE','CREDIT_NOTE'].includes(d.mappedType||''));const posted=sum(sales.map(d=>(d.mappedType==='CREDIT_NOTE'?-1:1)*d.total)),received=sum(receipts.filter(p=>p.party_id===row.id).map(p=>Number(p.amount)));return {sourceId:String(row.id),targetId:legacyId(before,row.id),name:payload.name,invoiceOutstanding:sum(balances.filter(b=>b.partyId===row.id).map(b=>b.outstanding)),unapplied:sum(receipts.filter(p=>p.party_id===row.id).map(p=>Number(p.amount)-sum(validAllocations.filter(a=>a.payment_id===p.id).map(a=>Number(a.amount))))),openingBalance:sum([posted,-received])};});
  for(const party of parties)if(sum([party.invoiceOutstanding,-party.unapplied])!==party.openingBalance)warnings.push('Review party credit/noninvoice balance mapping: '+party.sourceId);
  const stockGroups=new Map<string,InstanceType<typeof D>>();for(const movement of db.prepare('SELECT * FROM stock_movements').all()){if(String(movement.at).slice(0,10)>=cutoverDate)continue;stockGroups.set(String(movement.product_id),(stockGroups.get(String(movement.product_id))||new D(0)).plus(String(movement.quantity)));}
  if(stockGroups.size)warnings.push('v3 stock quantities are original ledger units. Review pack/base units and physical opening quantities explicitly; do not assume they are base units.');
  const stock=[...stockGroups].map(([sourceId,quantity])=>({sourceId,targetId:legacyId(before,sourceId),quantity:quantity.toString(),unitCost:null,costNeedsReview:true,unitBasisNeedsReview:true}));
  const taxRows=active.filter(d=>['TAX_INVOICE','BILL_OF_SUPPLY','DEBIT_NOTE','CREDIT_NOTE'].includes(d.mappedType||''));
  const tax=Object.fromEntries(['total','taxable','cgst','sgst','igst','cess'].map(key=>[key,sum(taxRows.map(d=>(d.mappedType==='CREDIT_NOTE'?-1:1)*Number((d as unknown as Row)[key])))]));
  const pdfs=options.pdfFolder?pdfFiles(options.pdfFolder):[];
  const pdfInventory=documents.map(d=>{const expected=d.number.replace(/[^\w.-]/g,'_')+'.pdf',matches=pdfs.filter(file=>basename(file).toLowerCase()===expected.toLowerCase());return {documentId:d.id,number:d.number,status:matches.length===1?'matched':matches.length?'ambiguous':'missing',files:matches.map(file=>({path:file,hash:hash(readFileSync(file))}))};});
  if(pdfInventory.some(p=>p.status!=='matched'))warnings.push('Missing or ambiguous original PDFs require explicit acceptance; PDFs are never regenerated during migration.');
  const summary={sourceHash:before,schema,cutoverDate,inventory,sourceDocuments:rows.length,issuedSnapshots:documents.filter(d=>d.validEvidence).length,customers:parties.length,products:inventory.find(i=>i.table==='products')!.count,payments:payments.length,totalMinor:sum(documents.filter(d=>d.validEvidence).map(d=>d.total)),documents,balances,parties,stock,tax,pdfInventory,mismatches,warnings,sourceFieldsPreserved:true,openingBalancesPosted:false,canImport:mismatches.length===0,reason:'Read-only preview. Explicit reconciliation acceptance and separate opening entries are required before cutover.'};
  return {...summary,reportHash:hash(summary)};
 }finally{db.close();if(hash(readFileSync(filename))!==before)throw Error('Read-only source copy unexpectedly changed.');}
}
