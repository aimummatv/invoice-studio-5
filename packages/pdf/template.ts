import * as v12 from './template-v4-12.ts';
import * as v11 from './template-v4-11.ts';
import * as v10 from './template-v4-10.ts';
import * as v9 from './template-v4-9.ts';
import * as v8 from './template-v4-8.ts';
import type {PresentationContext} from '../core/compliance-types.ts';
import * as v7 from './template-v4-7.ts';
import * as v6 from './template-v4-6.ts';
import * as v5 from './template-v4-5.ts';
import * as v4 from './template-v4-4.ts';
import type {Snapshot} from '../core/model.ts';
import * as v1 from './template-v4-1.ts';
import * as v2 from './template-v4-2.ts';
import * as v3 from './template-v4-3.ts';
export {escape} from './template-v4-2.ts';
export const PRINT_CSS=v12.PRINT_CSS;
export function invoiceCSS(snapshot:Snapshot):string{const styles:Record<string,string>={'v4-12':v12.PRINT_CSS,'v4-11':v11.PRINT_CSS,'v4-10':v10.PRINT_CSS,'v4-9':v9.PRINT_CSS,'v4-8':v8.PRINT_CSS,'v4-1':v1.PRINT_CSS,'v4-2':v2.PRINT_CSS,'v4-3':v3.PRINT_CSS,'v4-4':v4.PRINT_CSS,'v4-5':v5.PRINT_CSS,'v4-6':v6.PRINT_CSS,'v4-7':v7.PRINT_CSS};const css=styles[snapshot.templateVersion];if(!css)throw Error('Unsupported original invoice template version.');return css.replace(/body\{([^}]+)\}/,'.invoice{$1}');}
export function renderInvoice(snapshot:Snapshot,c?:PresentationContext,interactive=false):string{if(snapshot.templateVersion==='v4-12')return v12.renderInvoice(snapshot,c,interactive);if(snapshot.templateVersion==='v4-11')return v11.renderInvoice(snapshot,c,interactive);if(snapshot.templateVersion==='v4-10')return v10.renderInvoice(snapshot,c,interactive);if(snapshot.templateVersion==='v4-9'||(c&&snapshot.templateVersion==='v4-9'))return v9.renderInvoice(snapshot,c);if(snapshot.templateVersion==='v4-8'||c)return v8.renderInvoice(snapshot,c);if(snapshot.templateVersion==='v4-7')return v7.renderInvoice(snapshot);if(snapshot.templateVersion==='v4-6')return v6.renderInvoice(snapshot);if(snapshot.templateVersion==='v4-5')return v5.renderInvoice(snapshot);if(snapshot.templateVersion==='v4-1')return v1.renderInvoice(snapshot);if(snapshot.templateVersion==='v4-2')return v2.renderInvoice(snapshot);if(snapshot.templateVersion==='v4-4')return v4.renderInvoice(snapshot);if(snapshot.templateVersion==='v4-3')return v3.renderInvoice(snapshot);throw Error('Unsupported original invoice template version.');}
export function invoiceHTML(snapshot:Snapshot,c?:PresentationContext):string{if(snapshot.templateVersion==='v4-12')return v12.invoiceHTML(snapshot,c);if(snapshot.templateVersion==='v4-11')return v11.invoiceHTML(snapshot,c);if(snapshot.templateVersion==='v4-10')return v10.invoiceHTML(snapshot,c);if(snapshot.templateVersion==='v4-9')return v9.invoiceHTML(snapshot,c);if(snapshot.templateVersion==='v4-8'||c)return v8.invoiceHTML(snapshot,c);if(snapshot.templateVersion==='v4-7')return v7.invoiceHTML(snapshot);if(snapshot.templateVersion==='v4-6')return v6.invoiceHTML(snapshot);if(snapshot.templateVersion==='v4-5')return v5.invoiceHTML(snapshot);if(snapshot.templateVersion==='v4-1')return v1.invoiceHTML(snapshot);if(snapshot.templateVersion==='v4-2')return v2.invoiceHTML(snapshot);if(snapshot.templateVersion==='v4-4')return v4.invoiceHTML(snapshot);if(snapshot.templateVersion==='v4-3')return v3.invoiceHTML(snapshot);throw Error('Unsupported original invoice template version.');}
