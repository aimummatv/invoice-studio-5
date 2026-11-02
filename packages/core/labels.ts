/** Display labels for internal option values. Values stored in data never change; only what the person reads does. */
const LABELS:Record<string,string>={
  TAX_INVOICE:'Tax invoice',BILL_OF_SUPPLY:'Bill of supply',PROFORMA:'Proforma invoice',CHALLAN:'Delivery challan',ADVANCE_RECEIPT:'Advance receipt',CREDIT_NOTE:'Credit note',DEBIT_NOTE:'Debit note',
  domestic:'Domestic supply',exportLUT:'Export under LUT (no tax)',exportTax:'Export with tax payment',SEZLUT:'SEZ under LUT (no tax)',SEZTax:'SEZ with tax payment',
  taxable:'Taxable',nil:'Nil-rated',exempt:'Exempt',nonGST:'Non-GST',normal:'Normal',compact:'Compact',
  hsnSummary:'HSN summary',shipTo:'Ship-to address',bank:'Bank details',terms:'Terms & conditions',transport:'Transport details',batch:'Batch / lot',discount:'Discount column',cases:'Case quantities',words:'Amount in words',balance:'Balance due',qr:'UPI QR code',logo:'Logo',signature:'Signature'
};
export function prettyLabel(value:string):string{
  if(Object.hasOwn(LABELS,value))return LABELS[value]!;
  if(/^[A-Z]+(_[A-Z]+)+$/.test(value)){const t=value.toLowerCase().replaceAll('_',' ');return t[0]!.toUpperCase()+t.slice(1);}
  return value;
}
