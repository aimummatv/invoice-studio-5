import {readdirSync,readFileSync} from 'node:fs';import {join} from 'node:path';import {stripTypeScriptTypes} from 'node:module';
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(join(dir,x.name)):[join(dir,x.name)]);}
let checked=0;for(const p of [...walk('apps'),...walk('packages')].filter(p=>p.endsWith('.ts')&&!p.endsWith('.d.ts'))){stripTypeScriptTypes(readFileSync(p,'utf8'),{mode:'strip'});checked++;}console.log(`${checked} TypeScript source files parsed. Strict typechecking requires installed TypeScript.`);
