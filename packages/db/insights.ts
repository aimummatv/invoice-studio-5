import {randomUUID} from 'node:crypto';
import type {Store} from './store.ts';
import {D,sum,validDate} from '../core/money.ts';
import type {Dec} from '../core/money.ts';
import {parseBillText} from '../core/ocr-parse.ts';
import {canonical,hash} from './store.ts';
import type {PurchaseLine} from '../core/model.ts';
type Row=Record<string,unknown>;
const stamp=()=>new Date().toISOString();
export class Insights {
  s:Store;constructor(store:Store){this.s=store;}
  private canSeeCost(token:string):boolean{try{this.s.security.require(token,'cost');return true;}catch{return false;}}
  /** Products with stock, classified by how they sold in the last `days` days. Cost values only for users with the cost permission. */
  stockMovers(token:string,filter:Row={}):Row[]{
    this.s.actor(token,'read');const days=Math.max(7,Math.min(730,Number(filter.days)||90));const today=validDate(String(filter.asOf||''))?String(filter.asOf):new Date().toISOString().slice(0,10);
    const since=new Date(Date.parse(today+'T12:00:00Z')-days*86400000).toISOString().slice(0,10);const cost=this.canSeeCost(token);
    const sold=new Map<string,{qty:Dec;last:string}>();
    for(const r of this.s.db.prepare("SELECT product_id,quantity,date,kind FROM stock_movements WHERE kind IN('sale','sales-return') ORDER BY date").all()){
      const id=String(r.product_id),entry=sold.get(id)||{qty:new D(0),last:''};const q=new D(String(r.quantity)).abs();
      if(r.kind==='sale'){if(String(r.date)>=since)entry.qty=entry.qty.plus(q);if(String(r.date)>entry.last)entry.last=String(r.date);}
      else if(String(r.date)>=since)entry.qty=entry.qty.minus(q);
      sold.set(id,entry);}
    const rows=this.s.products().filter(p=>!p.archived&&p.tracked).map(p=>{
      const st=this.s.stock(p.id);const info=sold.get(p.id);const qty=info&&info.qty.gt(0)?info.qty:new D(0);
      const last=info?.last||'';const idle=last?Math.floor((Date.parse(today+'T12:00:00Z')-Date.parse(last+'T12:00:00Z'))/86400000):null;
      return {id:p.id,sku:p.sku,name:p.name,unit:p.unit,onHand:st.quantity,soldInPeriod:qty.toString(),lastSale:last,daysSinceLastSale:idle,...(cost?{stockValue:st.value}:{}),_qty:qty,_onHand:new D(st.quantity)};});
    const sellers=rows.filter(r=>r._qty.gt(0)).sort((a,b)=>b._qty.comparedTo(a._qty));const fastCut=Math.max(1,Math.ceil(sellers.length*0.2));const fastIds=new Set(sellers.slice(0,fastCut).map(r=>r.id));
    return rows.filter(r=>r._onHand.gt(0)||fastIds.has(r.id)).map(({_qty,_onHand,...r})=>({...r,status:fastIds.has(r.id)?'fast-moving':_qty.gt(0)?'slow':'dead',})).sort((a,b)=>({'dead':0,'slow':1,'fast-moving':2}[a.status as string]??3)-({'dead':0,'slow':1,'fast-moving':2}[b.status as string]??3)||String(a.sku).localeCompare(String(b.sku)));
  }
  /** Compare entered purchase costs with the previous purchase of the same product (per base unit). */
  priceChanges(token:string,input:{supplierId?:string;lines:PurchaseLine[];thresholdPercent?:number}):Row[]{
    this.s.actor(token,'purchase');const threshold=new D(input.thresholdPercent??5);const products=this.s.products();const out:Row[]=[];
    const prior=this.s.db.prepare('SELECT supplier_id,number,date,payload FROM purchase_documents ORDER BY date DESC,rowid DESC').all();
    const perBase=(l:{cost:string;cases:boolean;casePackAtPost?:string},pack:string)=>new D(l.cost||'0').div(l.cases?new D(l.casePackAtPost||pack||'1'):1);
    for(const l of input.lines||[]){const product=products.find(p=>p.id===l.productId);if(!product||!l.cost)continue;const now=perBase(l,product.casePack);if(now.lte(0))continue;
      let found:Row|null=null;
      for(const r of prior){const p=JSON.parse(String(r.payload)) as {lines:(PurchaseLine&{casePackAtPost?:string})[]};const m=p.lines.find(x=>x.productId===product.id&&x.cost);if(!m)continue;const cand={supplierId:String(r.supplier_id),number:String(r.number),date:String(r.date),before:perBase(m,product.casePack)};if(!found||(cand.supplierId===input.supplierId&&found.supplierId!==input.supplierId))found=cand;if(found.supplierId===input.supplierId)break;}
      if(!found)continue;const before=found.before as Dec;if(before.lte(0))continue;const pct=now.minus(before).div(before).times(100);
      if(pct.abs().gte(threshold))out.push({productId:product.id,sku:product.sku,name:product.name,previousCost:before.toDecimalPlaces(4).toString(),newCost:now.toDecimalPlaces(4).toString(),changePercent:pct.toDecimalPlaces(1).toString(),direction:pct.gt(0)?'increase':'decrease',previousBill:found.number,previousDate:found.date,sameSupplier:found.supplierId===input.supplierId});}
    return out;
  }
  /** Ready-to-open WhatsApp reminder for a customer's overdue/outstanding invoices. */
  whatsappReminder(token:string,partyId:string):Row{
    this.s.actor(token,'read');const party=this.s.customers().find(c=>c.id===partyId&&c.kind==='customer');if(!party)throw Error('Customer unavailable.');
    const open=this.s.register(token,'').filter(r=>r.customer_id===partyId&&Number(r.outstanding)>0&&!['CANCELLED'].includes(String(r.status)));
    const total=sum(open.map(r=>Number(r.outstanding)));if(!open.length)throw Error('No outstanding invoices for this customer.');
    const profile=this.s.profile();const fmt=(m:number)=>'₹'+(m/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
    const lines=open.slice(0,10).map(r=>`• ${r.number} (${r.date}): ${fmt(Number(r.outstanding))}`);
    const message=[`Namaste ${party.name},`,'',`A gentle reminder from ${profile.name}: ${fmt(total)} is outstanding.`,'',...lines,...(open.length>10?[`…and ${open.length-10} more`]:[]),'','Please share the payment details once paid. Thank you.'].join('\n');
    const digits=String(party.phone||'').replace(/\D/g,'');const phone=digits.length===10?'91'+digits:digits.length===12&&digits.startsWith('91')?digits:'';
    return {partyId,partyName:party.name,total,count:open.length,message,phoneValid:!!phone,url:phone?`https://wa.me/${phone}?text=${encodeURIComponent(message)}`:''};
  }
  /** Store OCR text from a supplier bill in a local searchable register. */
  saveScan(token:string,input:{fileName:string;fileHash:string;text:string;supplierId?:string;billNumber?:string;billDate?:string;total?:string}):Row{
    const a=this.s.actor(token,'purchase');const text=String(input.text||'');if(!text.trim())throw Error('No text was recognised in the scan.');if(text.length>500000)throw Error('Scanned text is too large.');
    if(!/^[a-f0-9]{64}$/.test(input.fileHash))throw Error('Invalid file fingerprint.');const parsed=parseBillText(text);
    const billDate=input.billDate||parsed.date;if(billDate&&!validDate(billDate))throw Error('Invalid bill date.');
    const existing=this.s.db.prepare('SELECT id,file_name FROM scanned_bills WHERE file_hash=?').get(input.fileHash);if(existing)return {id:existing.id,duplicate:true,fileName:existing.file_name};
    const id=randomUUID();return this.s.tx(()=>{this.s.db.prepare('INSERT INTO scanned_bills VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,stamp(),a.id,String(input.fileName).slice(0,200),input.fileHash,input.supplierId||null,String(input.billNumber||parsed.billNumber).slice(0,60),billDate,String(input.total||parsed.total).slice(0,30),text,canonical(parsed));this.s.audit(a,'bill-scanned',id,{fileName:String(input.fileName).slice(0,200),hash:hash(text)});return {id,duplicate:false,parsed};});
  }
  /** Match scanned item rows to catalogue products (by SKU or name appearing in the text) and raise price-change alerts. Suggestions only. */
  reviewScan(token:string,input:{supplierGstin?:string;lines:{description:string;rate:string}[]}):Row{
    this.s.actor(token,'purchase');const products=this.s.products().filter(p=>!p.archived);const norm=(x:string)=>x.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const supplier=this.s.customers().find(c=>c.kind==='supplier'&&input.supplierGstin&&c.gstin.toUpperCase()===input.supplierGstin.toUpperCase());
    const matched=(input.lines||[]).map(l=>{const text=' '+norm(l.description)+' ';const hit=products.filter(p=>text.includes(' '+norm(p.sku)+' ')||(norm(p.name).length>=4&&text.includes(' '+norm(p.name)+' '))).sort((a,b)=>b.name.length-a.name.length)[0];return {description:l.description,rate:l.rate,productId:hit?.id||'',sku:hit?.sku||'',name:hit?.name||''};});
    const alerts=this.priceChanges(token,{supplierId:supplier?.id||'',lines:matched.filter(m=>m.productId).map(m=>({productId:m.productId,quantity:'1',cases:false,batch:'',expiry:'',cost:m.rate,gst:'0',itc:'pending' as const}))});
    return {supplierId:supplier?.id||'',supplierName:supplier?.name||'',matched,alerts};
  }
  searchScans(token:string,query=''):Row[]{
    this.s.actor(token,'purchase');const terms=String(query).toLowerCase().split(/\s+/).filter(Boolean).slice(0,8);
    const where=terms.map(()=>"(lower(ocr_text) LIKE ? ESCAPE '\\' OR lower(bill_number) LIKE ? ESCAPE '\\' OR lower(file_name) LIKE ? ESCAPE '\\')").join(' AND ');
    const args=terms.flatMap(t=>{const p='%'+t.replace(/[\\%_]/g,m=>'\\'+m)+'%';return [p,p,p];});
    return this.s.db.prepare(`SELECT id,at,file_name,supplier_id,bill_number,bill_date,total,substr(ocr_text,1,300) snippet FROM scanned_bills ${where?'WHERE '+where:''} ORDER BY at DESC LIMIT 200`).all(...(args as string[]));
  }
  /** One search over issued documents, parties, products and scanned bills; a few suggestions per group. */
  globalSearch(token:string,query:string):Row[]{
    this.s.actor(token,'read');const q=String(query||'').trim().toLowerCase().slice(0,80);if(q.length<2)return [];const out:Row[]=[];
    const has=(...v:unknown[])=>v.join(' ').toLowerCase().includes(q);
    const money=(m:number)=>'₹'+(m/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
    for(const r of this.s.register(token,'').filter(r=>has(r.number,r.customerName,r.gstin,(Number(r.total)/100).toFixed(2))).slice(0,6))out.push({group:'Invoices',kind:'document',id:r.id,title:r.number,subtitle:`${r.customerName} · ${money(Number(r.total))} · ${r.status}`});
    for(const c of this.s.customers().filter(c=>has(c.name,c.gstin,c.phone,c.address)).slice(0,5))out.push({group:c.kind==='supplier'?'Suppliers':'Customers',kind:c.kind,id:c.id,title:c.name,subtitle:[c.gstin,c.phone].filter(Boolean).join(' · ')});
    for(const p of this.s.products().filter(p=>!p.archived&&has(p.sku,p.name,p.hsn)).slice(0,5))out.push({group:'Items',kind:'product',id:p.id,title:p.name,subtitle:`${p.sku} · HSN ${p.hsn} · ₹${p.rate}`});
    try{this.s.security.require(token,'purchase');for(const r of this.searchScans(token,q).slice(0,3))out.push({group:'Scanned bills',kind:'scan',id:r.id,title:String(r.bill_number||r.file_name),subtitle:String(r.file_name)});}catch{/* no purchase permission */}
    return out;
  }
  scanDetail(token:string,id:string):Row{this.s.actor(token,'purchase');const r=this.s.db.prepare('SELECT * FROM scanned_bills WHERE id=?').get(id);if(!r)throw Error('Scan not found.');return {...r,parsed:JSON.parse(String(r.parsed))};}
}
