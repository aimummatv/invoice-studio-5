import {Store,hash} from './store.ts';
import {Payments} from './payments.ts';
import {D,dec,sum,validDate} from '../core/money.ts';
import {businessDate} from '../core/model.ts';

interface ReportFilter {from?:string;to?:string;asOf?:string;partyId?:string;productId?:string}
type Row=Record<string,unknown>;
function dateRange(input:ReportFilter) {
 const from=input.from||'0001-01-01',to=input.to||input.asOf||businessDate();
 if(!validDate(from)||!validDate(to)||from>to)throw Error('Enter an ordered report date range.');
 return {from,to};
}
function bucket(dueDate:string,asOf:string) {
 if(!validDate(dueDate)||!validDate(asOf))throw Error('Invalid due/aging date.');
 const days=Math.max(0,Math.floor((Date.parse(asOf+'T12:00:00Z')-Date.parse(dueDate+'T12:00:00Z'))/86400000));
 return {overdueDays:days,bucket:days===0?'current':days<=30?'1–30':days<=60?'31–60':days<=90?'61–90':'90+'};
}
export class Reporting {
 readonly s:Store;
 constructor(store:Store){this.s=store;}
 private envelope(kind:string,filter:ReportFilter,body:Row) {
  return {kind,filter,generatedAt:new Date().toISOString(),sourceVersion:'4.0.0-dev.5',mode:'TEST',...body,reportHash:hash({kind,filter,body})};
 }

 collections(token:string,filter:ReportFilter={}) {
  this.s.actor(token,'read');const {from,to}=dateRange(filter);
  const receipts=this.s.db.prepare(`SELECT p.id,p.party_id,p.date,p.amount,p.mode,p.reference,
    EXISTS(SELECT 1 FROM payment_events e WHERE e.payment_id=p.id) reversed
    FROM payments p WHERE p.direction='receipt' AND p.date>=? AND p.date<=? ORDER BY p.date,p.rowid`).all(from,to)
   .filter(r=>!filter.partyId||r.party_id===filter.partyId);
  const adjustments=this.s.db.prepare('SELECT id,party_id,date,kind,amount,mode,reference FROM financial_adjustments WHERE date>=? AND date<=? ORDER BY date,rowid').all(from,to)
   .filter(r=>!filter.partyId||r.party_id===filter.partyId);
  const modes=['cash','UPI','bank','cheque','other'];
  const rows=modes.map(mode=>{
   const selected=receipts.filter(r=>r.mode===mode);
   const grossMinor=sum(selected.map(r=>r.amount as number));
   const reversedMinor=sum(selected.filter(r=>r.reversed).map(r=>r.amount as number));
   const refundedMinor=sum(adjustments.filter(r=>r.mode===mode&&r.kind==='refund').map(r=>r.amount as number));
   return {mode,grossMinor,reversedMinor,refundedMinor,netMinor:sum([grossMinor,-reversedMinor,-refundedMinor])};
  });
  const nonCash=['TDS','writeoff','settlement'].map(kind=>({kind,amountMinor:-sum(adjustments.filter(r=>r.kind===kind).map(r=>r.amount as number))}));
  return this.envelope('collections',{...filter,from,to},{rows,receipts,refunds:adjustments.filter(r=>r.kind==='refund'),nonCash,netMinor:sum(rows.map(r=>r.netMinor)),notice:'Reversed receipts remain visible. TDS, writeoffs and settlement discounts are not cash collections. Historical results reflect the currently revised books.'});
 }

 supplierAging(token:string,filter:ReportFilter={}) {
  this.s.actor(token,'purchase');const asOf=filter.asOf||filter.to||businessDate();if(!validDate(asOf))throw Error('Invalid aging date.');
  const payments=new Payments(this.s);const parties=new Map(this.s.customers().map(p=>[p.id,p]));
  const rows=this.s.db.prepare('SELECT id,supplier_id,number,date,payload FROM purchase_documents WHERE date<=? ORDER BY date,id').all(asOf)
   .filter(r=>!filter.partyId||r.supplier_id===filter.partyId).map(r=>{
    const payload=JSON.parse(r.payload as string);const dueDate=validDate(payload.dueDate)?payload.dueDate:r.date as string;
    const outstanding=payments.purchaseOutstanding(r.id as string,asOf);
    return {id:r.id,supplierId:r.supplier_id,supplier:parties.get(r.supplier_id as string)?.name||r.supplier_id,number:r.number,date:r.date,dueDate,outstanding,...bucket(dueDate,asOf),dueDateNeedsReview:!validDate(payload.dueDate)};
   }).filter(r=>r.outstanding>0);
  const buckets=Object.fromEntries(['current','1–30','31–60','61–90','90+'].map(key=>[key,sum(rows.filter(r=>r.bucket===key).map(r=>r.outstanding))]));
  const balances=this.s.customers().filter(p=>p.kind==='supplier'&&(!filter.partyId||p.id===filter.partyId)).map(p=>{
   const balance=sum(this.s.db.prepare('SELECT amount FROM supplier_ledger WHERE supplier_id=? AND date<=?').all(p.id,asOf).map(r=>r.amount as number));
   return {supplierId:p.id,name:p.name,balance,creditMinor:Math.max(0,-balance)};
  });
  return this.envelope('supplier-aging',{...filter,asOf},{rows,buckets,total:sum(rows.map(r=>r.outstanding)),balances,notice:'Aging uses frozen purchase due dates. Older purchases without a frozen due date are flagged; supplier master edits do not invent historical terms.'});
 }

 hsn(token:string,filter:ReportFilter={}) {
  this.s.actor(token,'tax');const {from,to}=dateRange(filter);const groups=new Map<string,Row>();let documents=0;
  for(const row of this.s.db.prepare("SELECT id FROM documents WHERE date>=? AND date<=? AND type IN('TAX_INVOICE','BILL_OF_SUPPLY','CREDIT_NOTE','DEBIT_NOTE')").all(from,to)){
   if(this.s.cancelled(row.id as string))continue;const snapshot=this.s.document(row.id as string)!.snapshot;
   if(filter.partyId&&snapshot.document.customerId!==filter.partyId)continue;documents++;
   const sign=snapshot.document.type==='CREDIT_NOTE'?-1:1;
   for(const line of snapshot.totals.lines){
    if(filter.productId&&line.productId!==filter.productId)continue;
    const key=[line.hsn,line.unit,line.category,line.gst,line.cess,snapshot.document.reverseCharge].join('|');
    const group=groups.get(key)||{hsn:line.hsn,unit:line.unit,category:line.category,gstRate:line.gst,cessRate:line.cess,reverseCharge:snapshot.document.reverseCharge,quantity:'0',taxableMinor:0,cgstMinor:0,sgstMinor:0,igstMinor:0,cessMinor:0,outputTaxMinor:0,recipientTaxMinor:0};
    group.quantity=new D(group.quantity as string).plus(dec(line.quantity).times(sign)).toString();
    for(const [field,value]of [['taxableMinor',line.taxable],['cgstMinor',line.cgst],['sgstMinor',line.sgst],['igstMinor',line.igst],['cessMinor',line.cessMinor]] as const)group[field]=sum([group[field] as number,sign*value]);
    const taxField=snapshot.document.reverseCharge?'recipientTaxMinor':'outputTaxMinor';group[taxField]=sum([group[taxField] as number,sign*line.tax]);groups.set(key,group);
   }
  }
  return this.envelope('hsn',{...filter,from,to},{rows:[...groups.values()],documents,taxableMinor:sum([...groups.values()].map(r=>r.taxableMinor as number)),outputTaxMinor:sum([...groups.values()].map(r=>r.outputTaxMinor as number)),recipientTaxMinor:sum([...groups.values()].map(r=>r.recipientTaxMinor as number))});
 }

 purchaseTax(token:string,filter:ReportFilter={}) {
  this.s.actor(token,'tax');const {from,to}=dateRange(filter);const rows:Row[]=[];
  for(const p of this.s.db.prepare('SELECT * FROM purchase_documents WHERE date>=? AND date<=? ORDER BY date,id').all(from,to)){
   if(filter.partyId&&p.supplier_id!==filter.partyId)continue;const payload=JSON.parse(p.payload as string);const lines=payload.lines as Row[];
   for(const [index,line]of lines.entries()){
    const quantity=line.baseQuantity?String(line.baseQuantity):line.cases?null:String(line.quantity);const taxableMinor=typeof line.taxableMinor==='number'?line.taxableMinor:quantity===null?null:dec(String(line.cost)).times(quantity).times(100).toDecimalPlaces(0).toNumber();
    const recordedTax=typeof line.taxMinor==='number'?line.taxMinor:null;
    rows.push({purchaseId:p.id,number:p.number,date:p.date,supplierId:p.supplier_id,supplierGstin:payload.supplierSnapshot?.gstin||null,line:index+1,productId:line.productId,quantity,taxableMinor,taxMinor:recordedTax,itcClassification:line.itc||'pending',claimable:false,needsTaxReview:recordedTax===null||taxableMinor===null||!payload.supplierSnapshot});
   }
  }
  for(const returned of this.s.db.prepare('SELECT r.*,p.supplier_id,p.number,p.payload purchase_payload FROM purchase_returns r JOIN purchase_documents p ON p.id=r.purchase_id WHERE r.date>=? AND r.date<=? ORDER BY r.date,r.id').all(from,to)){
   if(filter.partyId&&returned.supplier_id!==filter.partyId)continue;const purchase=JSON.parse(returned.purchase_payload as string),payload=JSON.parse(returned.payload as string);
   for(const entry of payload.lines){const original=purchase.lines[entry.lineIndex];const taxableMinor=Number.isSafeInteger(entry.valueMinor)?-entry.valueMinor:null,taxMinor=Number.isSafeInteger(entry.taxMinor)?-entry.taxMinor:null;
    rows.push({purchaseId:returned.purchase_id,returnId:returned.id,number:returned.number,date:returned.date,supplierId:returned.supplier_id,supplierGstin:purchase.supplierSnapshot?.gstin||null,line:entry.lineIndex+1,productId:original?.productId,quantity:dec(entry.quantity).negated().toString(),taxableMinor,taxMinor,itcClassification:original?.itc||'pending',claimable:false,needsTaxReview:taxableMinor===null||taxMinor===null||!purchase.supplierSnapshot,kind:'purchase-return'});
   }
  }
  for(const row of rows){const review=this.s.db.prepare("SELECT payload,actor_id,reason,at FROM gstr2b_reviews WHERE json_extract(payload,'$.purchaseId')=? AND json_extract(payload,'$.lineIndex')=? AND json_extract(payload,'$.effectivePeriod')<=? ORDER BY at DESC,rowid DESC LIMIT 1").get(String(row.purchaseId),Number(row.line)-1,to.slice(0,7));if(review){row.originalItcClassification=row.itcClassification;row.itcClassification=JSON.parse(String(review.payload)).classification;row.itcReview={reviewer:review.actor_id,reason:review.reason,at:review.at,effectivePeriod:JSON.parse(String(review.payload)).effectivePeriod};}}
  const eligible=rows.filter(r=>r.itcClassification==='eligible');const blocked=rows.filter(r=>r.itcClassification==='blocked');const pending=rows.filter(r=>r.itcClassification==='pending');
  return this.envelope('purchase-tax',{...filter,from,to},{rows,taxableMinor:sum(rows.map(r=>typeof r.taxableMinor==='number'?r.taxableMinor:0)),taxMinor:sum(rows.map(r=>typeof r.taxMinor==='number'?r.taxMinor:0)),classificationCounts:{eligible:eligible.length,blocked:blocked.length,pending:pending.length},exceptions:rows.filter(r=>r.needsTaxReview),notice:'Book classification and 2B review are separate evidence. Purchase returns are signed reversals. Totals include only known amounts; incomplete rows remain exceptions. No line is automatically marked claimable.'});
 }

 stock(token:string,filter:ReportFilter={}) {
  this.s.actor(token,'stock');const asOf=filter.asOf||filter.to||businessDate();if(!validDate(asOf))throw Error('Invalid stock date.');
  let costs=false;try{this.s.security.require(token,'cost');costs=true;}catch{}
  const configuration=JSON.parse((this.s.db.prepare("SELECT payload FROM app_settings WHERE key='stock'").get()?.payload as string)||'{}');const nearDays=Number.isInteger(configuration.nearExpiryDays)&&configuration.nearExpiryDays>=0?configuration.nearExpiryDays:30;
  const rows=this.s.products().filter(p=>p.tracked&&(!filter.productId||p.id===filter.productId)).map(p=>{
   const closing=this.s.stock(p.id,undefined,asOf);const lots=this.s.db.prepare('SELECT DISTINCT batch,expiry FROM stock_movements WHERE product_id=? AND date<=?').all(p.id,asOf).map(l=>{
    const lot=this.s.stock(p.id,l.batch as string,asOf);const days=l.expiry?Math.floor((Date.parse(String(l.expiry)+'T12:00:00Z')-Date.parse(asOf+'T12:00:00Z'))/86400000):null;
    return {batch:l.batch,expiry:l.expiry,quantity:lot.quantity,expired:days!==null&&days<0,nearExpiry:days!==null&&days>=0&&days<=nearDays};
   }).filter(l=>!new D(l.quantity).isZero());
   return {productId:p.id,sku:p.sku,name:p.name,unit:p.unit,quantity:closing.quantity,reorder:p.reorder,lowStock:dec(closing.quantity,true).lte(p.reorder),lots,...(costs?{valueMinor:closing.value,averageUnitCost:new D(closing.average).div(100).toFixed(6)}:{})};
  });
  return this.envelope('stock',{...filter,asOf},{rows,...(costs?{valueMinor:sum(rows.map(r=>r.valueMinor||0))}:{}),lowStock:rows.filter(r=>r.lowStock).length,expiredLots:rows.flatMap(r=>r.lots.filter(l=>l.expired).map(l=>({productId:r.productId,...l}))),nearExpiryLots:rows.flatMap(r=>r.lots.filter(l=>l.nearExpiry).map(l=>({productId:r.productId,...l}))) });
 }

 recordDetail(token:string,kind:string,recordId:string){
  this.s.actor(token,'read');if(kind==='document')return this.documentDetail(token,recordId);
  if(kind==='purchase'){this.s.actor(token,'purchase');const row=this.s.db.prepare('SELECT * FROM purchase_documents WHERE id=?').get(recordId);if(!row)throw Error('Purchase unavailable.');return {record:{...row,payload:JSON.parse(String(row.payload))},returns:this.s.db.prepare('SELECT * FROM purchase_returns WHERE purchase_id=? ORDER BY date,id').all(recordId).map(r=>({...r,payload:JSON.parse(String(r.payload))})),allocations:this.s.db.prepare('SELECT a.*,p.date,p.reference FROM supplier_allocations a JOIN payments p ON p.id=a.payment_id WHERE a.purchase_id=?').all(recordId),attachments:this.s.db.prepare('SELECT id,name,hash,at FROM attachments WHERE entity_id=?').all(recordId),outstanding:new Payments(this.s).purchaseOutstanding(recordId)};}
  if(kind==='payment')return new Payments(this.s).allocationHistory(token,recordId);
  if(kind==='party'){const party=this.s.customers().find(c=>c.id===recordId);if(!party)throw Error('Party unavailable.');if(party.kind==='supplier')this.s.actor(token,'purchase');return {party,rows:party.kind==='customer'?this.s.db.prepare('SELECT * FROM ledger WHERE party_id=? ORDER BY date,rowid').all(recordId):this.s.db.prepare('SELECT * FROM supplier_ledger WHERE supplier_id=? ORDER BY date,rowid').all(recordId)};}
  if(kind==='product'){this.s.actor(token,'stock');const p=this.s.products().find(p=>p.id===recordId);if(!p)throw Error('Product unavailable.');const rows=this.s.db.prepare('SELECT id,batch,expiry,quantity,kind,source_id,date,reason FROM stock_movements WHERE product_id=? ORDER BY date,rowid').all(recordId);let showCost=false;try{this.s.security.require(token,'cost');showCost=true;}catch{}const {purchaseCost,...safe}=p;return {product:showCost?p:safe,rows,stock:this.s.stock(recordId).quantity};}
  if(kind==='close'){this.s.actor(token,'close');const record=this.s.db.prepare('SELECT * FROM daily_closes WHERE id=?').get(recordId);if(!record)throw Error('Close unavailable.');const report=JSON.parse(String(record.payload));return {record:{...record,payload:report},documents:this.s.db.prepare('SELECT id,number,type,total FROM documents WHERE date=? ORDER BY number').all(String(record.date)),payments:this.s.db.prepare('SELECT id,amount,mode,reference,direction FROM payments WHERE date=?').all(String(record.date)),adjustments:this.s.db.prepare('SELECT * FROM financial_adjustments WHERE date=?').all(String(record.date)),stockExceptions:this.s.db.prepare("SELECT id,kind,product_id,quantity,reason FROM stock_movements WHERE date=? AND kind NOT IN('sale','purchase')").all(String(record.date))};}
  throw Error('Unsupported detail view.');
 }
 documentDetail(token:string,documentId:string) {
  this.s.actor(token,'read');const document=this.s.document(documentId);if(!document)throw Error('Document unavailable.');
  const allocated=this.s.db.prepare(`SELECT a.id,a.payment_id,p.date,p.mode,p.reference,a.amount,h.effective_date,r.effective_date reversedDate
    FROM payment_allocations a JOIN payments p ON p.id=a.payment_id
    JOIN allocation_history h ON h.direction='customer' AND h.allocation_id=a.id
    LEFT JOIN allocation_reversals r ON r.allocation_id=a.id WHERE a.document_id=? ORDER BY h.at,a.rowid`).all(documentId);
  const linked=this.s.db.prepare("SELECT id,number,type,date,total FROM documents WHERE json_extract(snapshot,'$.document.originalId')=? ORDER BY date,issued_at").all(documentId);
  const adjustments=this.s.db.prepare("SELECT date,kind,amount,source_id FROM ledger WHERE document_id=? AND kind!='invoice' ORDER BY date,rowid").all(documentId);
  const activity=this.s.db.prepare('SELECT at,actor_id,action FROM audit_events WHERE entity_id=? ORDER BY sequence').all(documentId);
  const position=this.s.outstanding(documentId);
  return {metadata:this.s.db.prepare('SELECT revision,payload,reason,actor_id,at FROM document_metadata_events WHERE document_id=? ORDER BY revision DESC').all(documentId).map(row=>({...row,values:JSON.parse(String(row.payload))})),document,cancelled:this.s.cancelled(documentId),allocated,linked,adjustments,activity,outstanding:Math.max(0,position),creditMinor:Math.max(0,-position),notice:'Issued financial values are read-only. Current allocations and linked corrections are shown separately.'};
 }
}
