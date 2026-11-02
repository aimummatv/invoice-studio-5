// Offline OCR for supplier-bill images. Uses Tesseract with English data bundled in node_modules: no network access is needed or allowed.
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
const require=createRequire(import.meta.url);
const unpacked=(p:string)=>p.replace(/app\.asar([\\/])/,'app.asar.unpacked$1');
export async function recognizeImage(image:Buffer):Promise<string> {
  if(!image.length||image.length>25*1024*1024)throw Error('Choose an image below 25 MB.');
  const {createWorker}=require('tesseract.js') as typeof import('tesseract.js');
  const langPath=unpacked(join(dirname(require.resolve('@tesseract.js-data/eng/package.json')),'4.0.0_best_int'));
  // Never fetch from a CDN: langPath is local and cacheMethod 'none' avoids writing next to the app.
  const worker=await createWorker('eng',1,{langPath,gzip:true,cacheMethod:'none',workerPath:unpacked(require.resolve('tesseract.js/src/worker-script/node/index.js')),corePath:unpacked(dirname(require.resolve('tesseract.js-core/package.json')))});
  try{const {data}=await worker.recognize(image);return String(data.text||'');}finally{await worker.terminate();}
}
