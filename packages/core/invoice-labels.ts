export type InvoiceLabels=Record<string,string>;
export const labelKey=(text:string)=>text.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
export function validateLabels(value:unknown):asserts value is InvoiceLabels {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>200)throw Error('Invalid invoice labels.');
 for(const [key,label]of Object.entries(value))if(!/^[a-z][a-z0-9_]{0,99}$/.test(key)||['constructor','prototype','__proto__'].includes(key)||typeof label!=='string'||label.length>300||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(label))throw Error('Invalid invoice label.');
}
export function escapeLabel(text:string){return text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
export function applyInvoiceLabels(html:string,labels:InvoiceLabels={},interactive=false):string {
 return html.replace(/<span data-invoice-label="([a-z0-9_]+)">([^<]*)<\/span>/g,(_all,key,original)=>`<span${interactive?` data-invoice-label="${key}" data-label-default="${original}" tabindex="0" role="button" aria-label="Edit label"`:''}>${Object.hasOwn(labels,key)?escapeLabel(labels[key]!):original}</span>`);
}
