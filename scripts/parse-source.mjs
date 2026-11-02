// Syntax-only check. Does not import, link or execute application/test modules.
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {stripTypeScriptTypes} from 'node:module';
import {SourceTextModule} from 'node:vm';
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):e.name.endsWith('.ts')?[join(dir,e.name)]:[]);
const files=[...walk('apps'),...walk('packages')];const errors=[];
for(const file of files){try{new SourceTextModule(stripTypeScriptTypes(readFileSync(file,'utf8'),{mode:'strip'}),{identifier:file});}catch(error){errors.push(file+'\n'+error.stack);}}
writeFileSync('qa/SOURCE_PARSE.log','Node 24 stripTypeScriptTypes + vm.SourceTextModule; syntax only, no linking/evaluation.\nFiles: '+files.length+'\n'+errors.join('\n')+'\nFailures: '+errors.length+'\n');
console.log('Source syntax files:',files.length,'Failures:',errors.length);if(errors.length){console.log(errors.join('\n'));process.exitCode=1;}
