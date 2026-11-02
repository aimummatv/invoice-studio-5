import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFileSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

const reference=process.env.STUDIO5_PRIVATE_REFERENCE||join(homedir(),'Documents','Invoice Studio 5','Private','Imports','partners-original.txt');
export function privateValues(source){
 const values=[...source.matchAll(/\b(?:\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]|[A-Z]{5}\d{4}[A-Z]|\d{10,14}|[A-Z]{4}0[A-Z0-9]{6})\b/g)].map(m=>m[0]);
 for(const label of ['Company Name','Legal Business Name','Account Holder','Registered Address'])for(const m of source.matchAll(new RegExp('^'+label+':[ \\t]*(.+)$','gmi')))values.push(m[1].trim());
 const legal=/Legal Business Name:[ \t]*(.+)/i.exec(source)?.[1]?.trim();if(legal){const brand=legal.replace(/\s+Enterprises$/i,'');values.push(brand,brand.replaceAll(' ',''),brand.toUpperCase().replaceAll(' ','_'));}
 return [...new Set(values)].filter(Boolean);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const values=existsSync(reference)?privateValues(readFileSync(reference,'utf8')):[];
 const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);const failures=[];
 for(const file of files){const bytes=readFileSync(file);const text=bytes.toString('utf8');if(/(?:^|\/)(?:Private|InvoiceStudio4Data|draft-recovery)\//i.test(file)||/(?:^|\/)(?:business-settings[^/]*\.json|partners-original\.txt|import-verification\.json)$/.test(file)||/\.(?:sqlite(?:-wal|-shm)?|db|is4b|key|pem|exe|asar|zip)$/i.test(file)||text.startsWith('SQLite format 3')||/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)||values.some(value=>text.toLowerCase().includes(value.toLowerCase())))failures.push(file);}
 if(process.argv.includes('--history')&&values.length){const history=execFileSync('git',['fast-export','--all','--signed-tags=strip'],{maxBuffer:100*1024*1024}).toString('utf8').toLowerCase();if(values.some(value=>history.includes(value.toLowerCase())))failures.push('reachable Git history');}
 if(failures.length){console.error('Publication blocked: private data or restricted files in '+failures.join(', '));process.exitCode=1;}else console.log('PASS: tracked source publication privacy scan'+(process.argv.includes('--history')?' and reachable history':'')+(values.length?' with local private reference.':' (no local private reference available).'));
}
