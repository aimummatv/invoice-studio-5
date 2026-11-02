import {mkdir,copyFile} from 'node:fs/promises';
try{
 const {build}=await import('vite');
 await build({configFile:false,root:'apps/desktop/renderer',base:'./',build:{commonjsOptions:{include:[/node_modules/,/packages[\\/]core[\\/]vendor/]},outDir:'../../../dist/renderer',emptyOutDir:true}});
 await build({configFile:false,build:{ssr:true,commonjsOptions:{include:[/node_modules/,/packages[\\/]core[\\/]vendor/]},outDir:'dist/main',emptyOutDir:true,target:'node24',lib:{entry:'apps/desktop/main/index.ts',formats:['es'],fileName:()=> 'index.js'},rollupOptions:{external:['electron',/^node:/,'tesseract.js','tesseract.js-core','@tesseract.js-data/eng']}}});
 await mkdir('dist/main',{recursive:true});await copyFile('apps/desktop/main/preload.cjs','dist/main/preload.cjs');
}catch(e){console.error('BUILD BLOCKED:',e.message);process.exitCode=1;}
