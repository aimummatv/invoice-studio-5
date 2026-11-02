import {canonical} from '../db/store.ts';
export async function exportReportWorkbook(name:string,filter:unknown,report:Record<string,unknown>){
 const module=await import('exceljs');const book=new module.default.Workbook();book.creator='Invoice Studio 4';
 book.addWorksheet('_Metadata').addRows([['report',name],['mode','TEST'],['sourceVersion','4.0.0-dev.5'],['generatedAt',new Date().toISOString()],['filters',canonical(filter)],['moneyUnit','Integer paise; decimal strings are preserved as text.']]);
 let count=0;for(const [key,value]of Object.entries(report)){if(!Array.isArray(value))continue;const rows=value as Record<string,unknown>[];if(!rows.length)continue;const sheet=book.addWorksheet((key.replace(/[^A-Za-z0-9 _-]/g,'').slice(0,24)||'Rows')+'-'+(++count));const columns=[...new Set(rows.flatMap(row=>Object.keys(row)))];sheet.addRow(columns);sheet.getRow(1).font={bold:true};sheet.views=[{state:'frozen',ySplit:1}];for(const row of rows)sheet.addRow(columns.map(k=>typeof row[k]==='object'?canonical(row[k]):String(row[k]??'')));columns.forEach((_,index)=>{sheet.getColumn(index+1).width=22;sheet.getColumn(index+1).numFmt='@';});}
 if(!count)book.addWorksheet('Summary').addRows(Object.entries(report).map(([key,value])=>[key,typeof value==='object'?canonical(value):String(value??'')]));return Buffer.from(await book.xlsx.writeBuffer());
}
