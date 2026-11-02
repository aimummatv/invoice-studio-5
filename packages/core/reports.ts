import type {Snapshot} from './model.ts';import {sum,validDate} from './money.ts';
export function aging(invoices:{snapshot:Snapshot;outstanding:number}[],asOf:string){
 if(!validDate(asOf))throw Error('Invalid aging date.');const rows=invoices.filter(x=>x.snapshot.document.date<=asOf&&x.outstanding>0).map(x=>{const due=x.snapshot.document.dueDate;const days=Math.max(0,Math.floor((Date.parse(asOf+'T12:00:00Z')-Date.parse(due+'T12:00:00Z'))/86400000));return {id:x.snapshot.document.id,customerId:x.snapshot.document.customerId,number:x.snapshot.number,dueDate:due,outstanding:x.outstanding,overdueDays:days,bucket:days===0?'current':days<=30?'1–30':days<=60?'31–60':days<=90?'61–90':'90+'};});
 const buckets:Record<string,number>={};for(const key of ['current','1–30','31–60','61–90','90+'])buckets[key]=sum(rows.filter(r=>r.bucket===key).map(r=>r.outstanding));return {asOf,rows,buckets,total:sum(rows.map(r=>r.outstanding))};
}
