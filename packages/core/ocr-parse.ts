// Pure text parser for OCR output of supplier bills. No I/O: every result is a *suggestion* the user must review.
export interface ScannedLine {description:string;quantity:string;rate:string;amount:string}
export interface ParsedBill {gstin:string;billNumber:string;date:string;total:string;lines:ScannedLine[];warnings:string[]}
const num=(s:string)=>Number(s.replace(/,/g,''));
const GSTIN=/\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/;
const NUMBER=/(?:bill|invoice|inv)\s*(?:no|number|#)?\.?\s*[:#-]?\s*([A-Z0-9][A-Z0-9/\-]{1,24})/i;
const DATE=/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b|\b(\d{4})-(\d{2})-(\d{2})\b/;
const LINE=/^(.*?[A-Za-z].*?)\s+(\d+(?:\.\d+)?)\s+(\d[\d,]*(?:\.\d+)?)\s+(\d[\d,]*(?:\.\d+)?)\s*$/;
function iso(m:RegExpMatchArray):string{
  const [y,mo,d]=m[4]?[m[4],m[5]!,m[6]!]:[m[3]!,m[2]!.padStart(2,'0'),m[1]!.padStart(2,'0')];
  const ok=Number(mo)>=1&&Number(mo)<=12&&Number(d)>=1&&Number(d)<=31;return ok?`${y}-${mo}-${d}`:'';
}
export function parseBillText(text:string):ParsedBill{
  const warnings:string[]=[];const rows=text.split(/\r?\n/).map(r=>r.replace(/[|]/g,' ').replace(/\s+/g,' ').trim()).filter(Boolean);
  const gstin=(text.toUpperCase().match(GSTIN)||[''])[0]!;
  let billNumber='';for(const r of rows){const m=r.match(NUMBER);if(m&&/\d/.test(m[1]!)&&!/^(date|dated|no)$/i.test(m[1]!)){billNumber=m[1]!;break;}}
  let date='';for(const r of rows){const m=r.match(DATE);if(m){date=iso(m);if(date)break;}}
  let total='';for(const r of rows){const m=r.match(/(?:grand\s*)?total\b[^\d]*([\d,]+(?:\.\d+)?)\s*$/i);if(m&&(!total||num(m[1]!)>=num(total)))total=String(num(m[1]!));}
  const lines:ScannedLine[]=[];
  for(const r of rows){const m=r.match(LINE);if(!m)continue;const q=num(m[2]!),rate=num(m[3]!),amount=num(m[4]!);
    // Accept a row only when quantity x rate reproduces the amount; this rejects dates, phone numbers and totals.
    if(q>0&&rate>0&&Math.abs(q*rate-amount)<=Math.max(1,amount*0.02))lines.push({description:m[1]!.trim(),quantity:String(q),rate:String(rate),amount:String(amount)});}
  if(!gstin)warnings.push('Supplier GSTIN not found.');if(!billNumber)warnings.push('Bill number not found.');if(!date)warnings.push('Bill date not found.');if(!total)warnings.push('Total not found.');if(!lines.length)warnings.push('No item rows recognised; enter items manually.');
  const sum=lines.reduce((s,l)=>s+num(l.amount),0);if(total&&lines.length&&sum>num(total)+1)warnings.push('Item amounts exceed the bill total; check the scan.');
  return {gstin,billNumber,date,total,lines,warnings};
}
