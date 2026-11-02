/** Human-readable, filesystem-safe PDF name: <invoice number>_<customer>.pdf (e.g. T4-TI-26-27-0001_Shree-Ganesh-Stores.pdf). */
const clean=(value:string,max:number)=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9._-]+/g,'-').replace(/-{2,}/g,'-').replace(/^[-.]+|[-.]+$/g,'').slice(0,max).replace(/[-.]+$/,'');
export function invoiceFileName(number:string,customerName:string):string{
  const n=clean(number,40)||'document';const c=clean(customerName,40);return c?`${n}_${c}.pdf`:`${n}.pdf`;
}
