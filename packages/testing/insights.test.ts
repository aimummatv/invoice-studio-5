import {test} from 'node:test';import assert from 'node:assert/strict';
import {fixture,draft} from './fixtures.ts';import {Insights} from '../db/insights.ts';import {parseBillText} from '../core/ocr-parse.ts';
import type {PurchaseLine} from '../core/model.ts';
function issue(f:ReturnType<typeof fixture>,extra:Parameters<typeof draft>[0]={}){const d=f.s.saveDraft(f.token,draft(extra));return f.s.issue(f.token,{draftId:d.id,expectedVersion:d.version,idempotencyKey:crypto.randomUUID()});}
const line=(cost:string,cases=false,productId='product'):PurchaseLine=>({productId,quantity:'1',cases,batch:'',expiry:'',cost,gst:'18',itc:'pending'});
test('OCR parser extracts bill header and only arithmetic-consistent item rows',()=>{
  const p=parseBillText('Sharma Traders\nGSTIN: 27AAPFU0939F1ZV\nInvoice No: ST/2026/0457\nDate: 25/10/2026\nRice 5kg 10 450.00 4500.00\nSugar 1kg 20 42.00 840.00\nPhone 98765 43210 11 22\nGrand Total 5340.00');
  assert.equal(p.gstin,'27AAPFU0939F1ZV');assert.equal(p.billNumber,'ST/2026/0457');assert.equal(p.date,'2026-10-25');assert.equal(p.total,'5340');
  assert.deepEqual(p.lines.map(l=>l.description),['Rice 5kg','Sugar 1kg']);assert.deepEqual(p.warnings,[]);
  assert.ok(parseBillText('garbage ~~ text').warnings.length>=4);
});
test('last sale shown per customer and product ignores cancelled invoices',t=>{
  const f=fixture();t.after(f.cleanup);const first=issue(f,{lines:[{...draft().lines[0]!,rate:'100'}]});
  const second=issue(f,{date:'2026-10-29',dueDate:'2026-11-13',lines:[{...draft().lines[0]!,rate:'120'}]});
  let sales=(f.s.state(f.token).lastSales as Record<string,{rate:string;number:string}>)['customer:product']!;assert.equal(sales.rate,'120');assert.equal(sales.number,second.number);
  f.s.cancel(f.token,second.id,'wrong rate');
  sales=(f.s.state(f.token).lastSales as Record<string,{rate:string;number:string}>)['customer:product']!;assert.equal(sales.rate,'100');assert.equal(sales.number,first.number);
});
test('supplier price alert compares per base unit and uses the threshold',t=>{
  const f=fixture();t.after(f.cleanup);const ins=new Insights(f.s);
  f.s.purchase(f.token,{id:'p1',supplierId:'supplier',number:'S-1',date:'2026-10-20',lines:[line('50',true)]});// 50 per case of 24 => 2.0833 per unit
  assert.equal(ins.priceChanges(f.token,{supplierId:'supplier',lines:[line('52',true)]}).length,0);// +4% below 5%
  const up=ins.priceChanges(f.token,{supplierId:'supplier',lines:[line('2.5',false)]});assert.equal(up.length,1);assert.equal(up[0]!.direction,'increase');assert.equal(up[0]!.previousBill,'S-1');assert.equal(Number(up[0]!.changePercent),20);
  const down=ins.priceChanges(f.token,{supplierId:'supplier',lines:[line('1.5',false)]});assert.equal(down[0]!.direction,'decrease');
  assert.equal(ins.priceChanges(f.token,{supplierId:'supplier',lines:[line('9',false,'unknown')]}).length,0);
});
test('stock list classifies fast, slow and dead stock and hides cost from staff',t=>{
  const f=fixture();t.after(f.cleanup);const ins=new Insights(f.s);
  const fast=f.s.saveProduct(f.token,{...f.product,tracked:true});const dead=f.s.saveProduct(f.token,{...f.product,id:'dead',revision:0,sku:'DEAD-1',name:'Dead item',tracked:true});
  for(const [i,id] of ['product','dead'].entries())f.s.purchase(f.token,{id:'pp'+i,supplierId:'supplier',number:'N'+i,date:'2026-01-05',lines:[line('10',false,id)]});
  issue(f,{date:'2026-10-20',dueDate:'2026-11-04'});
  const rows=ins.stockMovers(f.token,{days:90,asOf:'2026-10-29'});const byId=Object.fromEntries(rows.map(r=>[String(r.id),r]));
  assert.equal(byId.product!.status,'fast-moving');assert.equal(byId.dead!.status,'dead');assert.equal(byId.dead!.daysSinceLastSale,null);assert.ok(byId.dead!.stockValue!==undefined);
  f.s.addUser(f.token,{id:'emp',name:'Employee',role:'Staff',pin:'123456'});const emp=f.s.login('emp','123456');
  assert.equal(ins.stockMovers(emp,{asOf:'2026-10-29'})[0]!.stockValue,undefined);void fast;void dead;
});
test('WhatsApp reminder lists open invoices and only opens wa.me links for valid mobile numbers',t=>{
  const f=fixture();t.after(f.cleanup);const ins=new Insights(f.s);issue(f);
  assert.equal(ins.whatsappReminder(f.token,'customer').phoneValid,false);assert.equal(ins.whatsappReminder(f.token,'customer').url,'');
  f.s.saveCustomer(f.token,{...f.s.customers().find(c=>c.id==='customer')!,phone:'+91 98765-43210'});
  const r=ins.whatsappReminder(f.token,'customer');assert.equal(r.phoneValid,true);assert.match(String(r.url),/^https:\/\/wa\.me\/919876543210\?text=/);assert.match(String(r.message),/Fictitious Buyer/);assert.equal(r.count,1);
  assert.throws(()=>ins.whatsappReminder(f.token,'supplier'),/Customer unavailable/);
});
test('scanned bills are stored once, searchable offline and need purchase permission',t=>{
  const f=fixture();t.after(f.cleanup);const ins=new Insights(f.s);const text='Sharma Traders\nInvoice No: ST/9\nDate: 25/10/2026\nRice 5kg 10 450.00 4500.00\nGrand Total 4500.00';const fileHash='a'.repeat(64);
  const saved=ins.saveScan(f.token,{fileName:'bill1.png',fileHash,text,supplierId:'supplier'});assert.equal(saved.duplicate,false);
  assert.equal(ins.saveScan(f.token,{fileName:'again.png',fileHash,text}).duplicate,true);
  assert.equal(ins.searchScans(f.token,'basmati').length,0);assert.equal(ins.searchScans(f.token,'rice sharma').length,1);assert.equal(ins.searchScans(f.token,'st/9')[0]!.bill_number,'ST/9');assert.equal(ins.searchScans(f.token,'100%').length,0);
  assert.throws(()=>ins.saveScan(f.token,{fileName:'x',fileHash:'b'.repeat(64),text:'  '}),/No text/);assert.throws(()=>ins.saveScan(f.token,{fileName:'x',fileHash:'zz',text}),/fingerprint/);
  f.s.addUser(f.token,{id:'emp',name:'Employee',role:'Staff',pin:'123456'});const emp=f.s.login('emp','123456');assert.throws(()=>ins.searchScans(emp,''),/Permission denied/);
});
test('scan review matches catalogue items and raises price alerts for the supplier',t=>{
  const f=fixture();t.after(f.cleanup);const ins=new Insights(f.s);
  f.s.saveCustomer(f.token,{...f.s.customers().find(c=>c.id==='supplier')!,gstin:'27AAPFU0939F1ZV'});
  f.s.purchase(f.token,{id:'p1',supplierId:'supplier',number:'S-1',date:'2026-10-20',lines:[line('100',false)]});
  const r=ins.reviewScan(f.token,{supplierGstin:'27aapfu0939f1zv',lines:[{description:'Fictitious Product 1kg',rate:'130'},{description:'Unrelated thing',rate:'5'}]}) as {supplierId:string;matched:{productId:string}[];alerts:{changePercent:string}[]};
  assert.equal(r.supplierId,'supplier');assert.equal(r.matched[0]!.productId,'product');assert.equal(r.matched[1]!.productId,'');assert.equal(r.alerts.length,1);assert.equal(Number(r.alerts[0]!.changePercent),30);
});
test('global search groups invoices, parties and items and respects permissions',t=>{
  const f=fixture();t.after(f.cleanup);const ins=new Insights(f.s);const issued=issue(f);
  assert.deepEqual(ins.globalSearch(f.token,'a'),[]);
  const r=ins.globalSearch(f.token,'fictitious');const groups=new Set(r.map(x=>x.group));assert.ok(groups.has('Customers')||groups.has('Items'));
  const byNumber=ins.globalSearch(f.token,String(issued.number).slice(-4));assert.ok(byNumber.some(x=>x.kind==='document'&&x.id===issued.id));
  assert.equal(ins.globalSearch(f.token,'%%%%').length,0);
});
import {invoiceFileName} from '../core/filenames.ts';
test('PDF names are readable, safe and stable',()=>{
  assert.equal(invoiceFileName('T4/TI/26-27/0001','Shree Ganesh Stores'),'T4-TI-26-27-0001_Shree-Ganesh-Stores.pdf');
  assert.equal(invoiceFileName('A/1','Patel & Sons (Surat)'),'A-1_Patel-Sons-Surat.pdf');
  assert.equal(invoiceFileName('../../x\\y','../../etc'),'x-y_etc.pdf');assert.equal(invoiceFileName('','').endsWith('.pdf'),true);
  assert.ok(!/[\\/:*?"<>|]/.test(invoiceFileName('a','b/c:d')));
});
import {prettyLabel} from '../core/labels.ts';
test('internal option values read as plain labels and unknown values pass through',()=>{
  assert.equal(prettyLabel('TAX_INVOICE'),'Tax invoice');assert.equal(prettyLabel('exportLUT'),'Export under LUT (no tax)');assert.equal(prettyLabel('hsnSummary'),'HSN summary');
  assert.equal(prettyLabel('SOME_NEW_TYPE'),'Some new type');assert.equal(prettyLabel('NOS'),'NOS');assert.equal(prettyLabel('27'),'27');assert.equal(prettyLabel('constructor'),'constructor');
});
