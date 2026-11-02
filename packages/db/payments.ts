import {randomUUID} from 'node:crypto';
import {Store,canonical,hash} from './store.ts';
import {activeCustomerAllocation,activeSupplierAllocation,supplierAllocationAt} from './allocation-queries.ts';
import {id,text} from '../core/validation.ts';
import {sum,validDate} from '../core/money.ts';
import type {Actor,Allocation} from '../core/model.ts';

export interface SupplierAllocation {purchaseId:string;amount:number}
export interface AllocationRequest {
 commandKey:string;
 paymentId:string;
 effectiveDate:string;
 reason:string;
 expectedAllocationHash?:string;
}
interface AllocationResult {
 paymentId:string;
 allocated:number;
 unapplied:number;
 allocationIds:string[];
}
type PaymentRow={id:string;party_id:string;amount:number;date:string;direction:'receipt'|'supplier'};

export class Payments {
 readonly s:Store;
 constructor(store:Store){this.s=store;}

 private validateRequest(input:AllocationRequest):void {
  id(input.commandKey);id(input.paymentId);text(input.reason,'Reason',2000);
  if(input.reason.trim().length<3||!validDate(input.effectiveDate))throw Error('A valid effective date and reason are required.');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  if(input.effectiveDate>today)throw Error('Post allocation changes on their actual date; future allocation commands are not supported.');
 }

 private payment(paymentId:string,direction:'receipt'|'supplier'):PaymentRow {
  const row=this.s.db.prepare('SELECT * FROM payments WHERE id=? AND direction=? AND id NOT IN(SELECT payment_id FROM payment_events)').get(paymentId,direction) as PaymentRow|undefined;
  if(!row)throw Error('Select an active payment of the correct direction.');
  this.s.checkPeriod(row.date);
  return row;
 }

 private replay(key:string,digest:string):AllocationResult|null {
  const saved=this.s.db.prepare('SELECT request_hash,result FROM allocation_commands WHERE key=?').get(key);
  if(!saved)return null;
  if(saved.request_hash!==digest)throw Error('This command key belongs to another allocation request. Reopen the form for a new request.');
  return JSON.parse(saved.result as string) as AllocationResult;
 }

 private finish(actor:Actor,input:AllocationRequest,digest:string,result:AllocationResult,action:string):AllocationResult {
  this.s.db.prepare('INSERT INTO allocation_commands VALUES(?,?,?,?,?,?)').run(input.commandKey,digest,input.paymentId,canonical(result),actor.id,new Date().toISOString());
  this.s.audit(actor,action,input.paymentId,{commandKey:input.commandKey,effectiveDate:input.effectiveDate,reason:input.reason,allocated:result.allocated});
  const payment=this.s.db.prepare('SELECT id,party_id,amount,mode,reference,date,direction FROM payments WHERE id=?').get(input.paymentId)!;
  const customer=this.s.db.prepare(`SELECT a.id,a.document_id,a.amount FROM payment_allocations a WHERE a.payment_id=? AND ${activeCustomerAllocation()}`).all(input.paymentId);
  const supplier=this.s.db.prepare(`SELECT a.id,a.purchase_id,a.amount FROM supplier_allocations a WHERE a.payment_id=? AND ${activeSupplierAllocation()}`).all(input.paymentId);
  const version=(this.s.db.prepare("SELECT MAX(version) n FROM sync_outbox WHERE entity_id=? AND target='SHEETS_PAYMENTS'").get(input.paymentId)?.n as number||0)+1;
  for(const row of this.s.db.prepare('SELECT DISTINCT document_id FROM payment_allocations WHERE payment_id=?').all(input.paymentId))this.s.mirrorDocumentBalance(row.document_id as string);
  this.s.enqueue(input.paymentId,version,'SHEETS_PAYMENTS',{...payment,customerAllocations:customer,supplierAllocations:supplier,unapplied:result.unapplied});
  return result;
 }

 allocateCustomerAdvance(token:string,input:AllocationRequest&{allocations:Allocation[]}):AllocationResult {
  const actor=this.s.actor(token,'payments');this.validateRequest(input);return this.changeCustomer(actor,input,false);
 }
 replaceCustomerAllocations(token:string,input:AllocationRequest&{allocations:Allocation[]}):AllocationResult {
  const actor=this.s.actor(token,'payments');this.s.actor(token,'approve');this.validateRequest(input);return this.changeCustomer(actor,input,true);
 }
 private changeCustomer(actor:Actor,input:AllocationRequest&{allocations:Allocation[]},replace:boolean):AllocationResult {
  if(!Array.isArray(input.allocations)||input.allocations.length>1000)throw Error('Use up to 1,000 allocations.');
  if(!replace&&!input.allocations.length)throw Error('Add at least one invoice allocation.');
  const digest=hash({action:replace?'replace-customer-allocations':'allocate-customer-advance',...input});
  return this.s.tx(()=>{
   const repeated=this.replay(input.commandKey,digest);if(repeated)return repeated;this.s.checkPeriod(input.effectiveDate);
   const payment=this.payment(input.paymentId,'receipt');
   if(input.effectiveDate<payment.date)throw Error('Reallocation cannot predate the receipt.');
   const old=this.s.db.prepare(`SELECT a.* FROM payment_allocations a WHERE a.payment_id=? AND ${activeCustomerAllocation()}`).all(payment.id);
   const currentHash=hash(old.map(r=>({id:r.id,targetId:r.document_id,amount:r.amount})).sort((x,y)=>String(x.id).localeCompare(String(y.id))));if(replace&&input.expectedAllocationHash!==currentHash)throw Error('Allocations changed since this form was opened. Reload before replacing them.');
   if(replace)for(const row of old){const doc=this.s.document(row.document_id as string)!;this.s.checkPeriod(doc.snapshot.document.date);if(input.effectiveDate<doc.snapshot.document.date)throw Error('Reallocation cannot predate an existing invoice allocation.');}
   if(replace)for(const row of old)this.s.db.prepare('INSERT INTO allocation_reversals VALUES(?,?,?,?,?,?)').run(randomUUID(),row.id as string,input.effectiveDate,actor.id,input.reason,new Date().toISOString());
   let allocated=replace?0:sum(old.map(r=>r.amount as number));const seen=new Set<string>(),allocationIds:string[]=[];
   for(const target of input.allocations){
    id(target.documentId);if(seen.has(target.documentId)||!Number.isSafeInteger(target.amount)||target.amount<=0)throw Error('Allocations must use unique invoices and positive integer paise.');seen.add(target.documentId);
    const doc=this.s.document(target.documentId);
    if(!doc||this.s.cancelled(doc.id)||doc.snapshot.document.customerId!==payment.party_id||!['TAX_INVOICE','BILL_OF_SUPPLY','DEBIT_NOTE'].includes(doc.snapshot.document.type))throw Error('Select an active sales invoice for this receipt customer.');
    this.s.checkPeriod(doc.snapshot.document.date);
    if(input.effectiveDate<doc.snapshot.document.date)throw Error('Allocation cannot predate its invoice.');
    if(target.amount>this.s.outstanding(doc.id))throw Error('Allocation exceeds the invoice balance after releasing this receipt’s previous allocations.');
    allocated=sum([allocated,target.amount]);if(allocated>payment.amount)throw Error('Allocations exceed the receipt.');
    allocationIds.push(this.s.addCustomerAllocation(payment.id,doc.id,target.amount,input.effectiveDate,actor.id));
   }
   return this.finish(actor,input,digest,{paymentId:payment.id,allocated,unapplied:payment.amount-allocated,allocationIds},replace?'receipt-reallocated':'customer-advance-allocated');
  });
 }

 allocateSupplierAdvance(token:string,input:AllocationRequest&{allocations:SupplierAllocation[]}):AllocationResult {
  const actor=this.s.actor(token,'purchase');this.validateRequest(input);
  return this.changeSupplier(actor,input,false);
 }

 replaceSupplierAllocations(token:string,input:AllocationRequest&{allocations:SupplierAllocation[]}):AllocationResult {
  const actor=this.s.actor(token,'purchase');this.s.actor(token,'approve');this.validateRequest(input);
  return this.changeSupplier(actor,input,true);
 }

 private changeSupplier(actor:Actor,input:AllocationRequest&{allocations:SupplierAllocation[]},replace:boolean):AllocationResult {
  if(!Array.isArray(input.allocations)||input.allocations.length>1000)throw Error('Use up to 1,000 purchase allocations.');
  if(!replace&&!input.allocations.length)throw Error('Add at least one purchase allocation.');
  const digest=hash({action:replace?'replace-supplier-allocations':'allocate-supplier-advance',...input});
  return this.s.tx(()=>{
   const repeated=this.replay(input.commandKey,digest);if(repeated)return repeated;this.s.checkPeriod(input.effectiveDate);
   const payment=this.payment(input.paymentId,'supplier');
   if(input.effectiveDate<payment.date)throw Error('Allocation cannot predate the supplier payment.');
   const old=this.s.db.prepare(`SELECT a.* FROM supplier_allocations a WHERE a.payment_id=? AND ${activeSupplierAllocation()}`).all(payment.id);
   if(replace){const currentHash=hash(old.map(r=>({id:r.id,targetId:r.purchase_id,amount:r.amount})).sort((x,y)=>String(x.id).localeCompare(String(y.id))));if(input.expectedAllocationHash!==currentHash)throw Error('Supplier allocations changed since this form was opened. Reload first.');}
   if(replace)for(const row of old){const purchase=this.s.db.prepare('SELECT date FROM purchase_documents WHERE id=?').get(row.purchase_id as string)!;this.s.checkPeriod(purchase.date as string);if(input.effectiveDate<(purchase.date as string))throw Error('Reallocation cannot predate an existing purchase allocation.');this.s.db.prepare('INSERT INTO supplier_allocation_reversals VALUES(?,?,?,?,?,?)').run(randomUUID(),row.id as string,input.effectiveDate,actor.id,input.reason,new Date().toISOString());}
   let allocated=replace?0:sum(old.map(r=>r.amount as number));const seen=new Set<string>(),allocationIds:string[]=[];
   for(const target of input.allocations){
    id(target.purchaseId);if(seen.has(target.purchaseId)||!Number.isSafeInteger(target.amount)||target.amount<=0)throw Error('Use unique purchases and positive integer paise.');seen.add(target.purchaseId);
    const purchase=this.s.db.prepare('SELECT id,supplier_id,date,total FROM purchase_documents WHERE id=?').get(target.purchaseId);
    if(!purchase||purchase.supplier_id!==payment.party_id)throw Error('Purchase must belong to the supplier payment.');
    this.s.checkPeriod(purchase.date as string);if(input.effectiveDate<(purchase.date as string))throw Error('Allocation cannot predate the purchase.');
    const used=sum(this.s.db.prepare(`SELECT a.amount FROM supplier_allocations a WHERE a.purchase_id=? AND ${activeSupplierAllocation()}`).all(target.purchaseId).map(r=>r.amount as number));
    const returned=sum(this.s.db.prepare('SELECT total FROM purchase_returns WHERE purchase_id=?').all(target.purchaseId).map(r=>r.total as number));
    if(target.amount>sum([purchase.total as number,-used,-returned]))throw Error('Allocation exceeds the purchase payable.');
    allocated=sum([allocated,target.amount]);if(allocated>payment.amount)throw Error('Allocations exceed the supplier payment.');
    allocationIds.push(this.s.addSupplierAllocation(payment.id,target.purchaseId,target.amount,input.effectiveDate,actor.id));
   }
   return this.finish(actor,input,digest,{paymentId:payment.id,allocated,unapplied:payment.amount-allocated,allocationIds},replace?'supplier-payment-reallocated':'supplier-advance-allocated');
  });
 }

 purchaseOutstanding(purchaseId:string,asOf?:string):number {
  id(purchaseId);if(asOf&&!validDate(asOf))throw Error('Invalid report date.');
  const purchase=this.s.db.prepare('SELECT date,total FROM purchase_documents WHERE id=?').get(purchaseId);
  if(!purchase)throw Error('Purchase unavailable.');
  if(asOf&&(purchase.date as string)>asOf)return 0;
  const allocations=asOf
   ?this.s.db.prepare(`SELECT a.amount FROM supplier_allocations a WHERE a.purchase_id=? AND ${supplierAllocationAt()}`).all(purchaseId,asOf,asOf)
   :this.s.db.prepare(`SELECT a.amount FROM supplier_allocations a WHERE a.purchase_id=? AND ${activeSupplierAllocation()}`).all(purchaseId);
  const returns=asOf
   ?this.s.db.prepare('SELECT total FROM purchase_returns WHERE purchase_id=? AND date<=?').all(purchaseId,asOf)
   :this.s.db.prepare('SELECT total FROM purchase_returns WHERE purchase_id=?').all(purchaseId);
  return sum([purchase.total as number,-sum(allocations.map(r=>r.amount as number)),-sum(returns.map(r=>r.total as number))]);
 }

 allocationHistory(token:string,paymentId:string) {
  this.s.actor(token,'read');id(paymentId);
  const payment=this.s.db.prepare('SELECT id,party_id,amount,mode,reference,date,direction FROM payments WHERE id=?').get(paymentId);
  if(!payment)throw Error('Payment unavailable.');
  if(payment.direction==='supplier')this.s.actor(token,'purchase');
  const rows=payment.direction==='supplier'
   ?this.s.db.prepare(`SELECT a.id,a.purchase_id targetId,d.number,a.amount,h.effective_date allocatedDate,r.effective_date reversedDate,r.reason
     FROM supplier_allocations a JOIN purchase_documents d ON d.id=a.purchase_id
     JOIN allocation_history h ON h.direction='supplier' AND h.allocation_id=a.id
     LEFT JOIN supplier_allocation_reversals r ON r.allocation_id=a.id WHERE a.payment_id=? ORDER BY h.at,a.rowid`).all(paymentId)
   :this.s.db.prepare(`SELECT a.id,a.document_id targetId,d.number,a.amount,h.effective_date allocatedDate,r.effective_date reversedDate,r.reason
     FROM payment_allocations a JOIN documents d ON d.id=a.document_id
     JOIN allocation_history h ON h.direction='customer' AND h.allocation_id=a.id
     LEFT JOIN allocation_reversals r ON r.allocation_id=a.id WHERE a.payment_id=? ORDER BY h.at,a.rowid`).all(paymentId);
  const reversed=!!this.s.db.prepare('SELECT 1 FROM payment_events WHERE payment_id=?').get(paymentId);
  const active=rows.filter(r=>!r.reversedDate&&!reversed);
  const allocated=sum(active.map(r=>r.amount as number));
  return {payment,reversed,rows,active,allocationHash:hash(active.map(r=>({id:r.id,targetId:r.targetId,amount:r.amount})).sort((x,y)=>String(x.id).localeCompare(String(y.id)))),allocated,unapplied:reversed?0:(payment.amount as number)-allocated};
 }
}
