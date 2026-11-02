// Link the local ESM graph without evaluating application code. External packages are stubs.
import {readFileSync,readdirSync,existsSync,writeFileSync} from 'node:fs';
import {resolve,dirname,extname,relative} from 'node:path';
import {stripTypeScriptTypes} from 'node:module';
import {SourceTextModule,SyntheticModule} from 'node:vm';
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(resolve(dir,e.name)):e.name.endsWith('.ts')?[resolve(dir,e.name)]:[]);
const files=[...walk('apps'),...walk('packages')].filter(p=>!p.endsWith('.d.ts'));
const symbols=new Set(['default']);const sources=new Map();
for(const file of files){const code=stripTypeScriptTypes(readFileSync(file,'utf8'),{mode:'strip'});sources.set(file,code);for(const match of code.matchAll(/import\s*\{([^}]+)\}\s*from/g))for(const name of match[1].split(','))symbols.add(name.trim().split(/\s+as\s+/)[0]);}
const cache=new Map(),stubs=new Map(),failures=[];
function moduleFor(file){if(!cache.has(file))cache.set(file,new SourceTextModule(sources.get(file),{identifier:file}));return cache.get(file);}
function linker(specifier,referencing){if(specifier.startsWith('.')){const file=resolve(dirname(referencing.identifier),specifier);if(!existsSync(file))throw Error('Missing local import '+specifier+' in '+relative(process.cwd(),referencing.identifier));if(sources.has(file))return moduleFor(file);}
 if(!stubs.has(specifier))stubs.set(specifier,new SyntheticModule([...symbols],()=>{},{identifier:specifier}));return stubs.get(specifier);
}
for(const file of files){const m=moduleFor(file);if(m.status==='unlinked')try{await m.link(linker);}catch(error){failures.push(relative(process.cwd(),file)+': '+error.message);}}
const output='Local ESM import/export link check only; external modules stubbed; no application/test evaluation.\nModules: '+files.length+'\n'+failures.join('\n')+'\nFailures: '+failures.length+'\n';writeFileSync('qa/SOURCE_LINKS.log',output);console.log(output);if(failures.length)process.exitCode=1;
