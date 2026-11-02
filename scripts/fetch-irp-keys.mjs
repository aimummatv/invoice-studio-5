import JSZip from 'jszip';
import {createPublicKey,createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
const keys=[];
for(const [list,issuer,environment] of [['PubKeysEinv1','NIC IRP-1','production'],['PubKeysEinv2','NIC IRP-2','production'],['PubKeysSb','NIC Sandbox','sandbox']]){
 const source='https://einvoice1.gst.gov.in/documents/'+list+'.json';
 const rows=await(await fetch(source,{signal:AbortSignal.timeout(20000)})).json();
 for(const row of rows){const url=new URL(row.FilePath,'https://einvoice1.gst.gov.in').href;
  const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Public-key download failed: '+url);
  const zip=await JSZip.loadAsync(await response.arrayBuffer());
  for(const entry of Object.values(zip.files)){if(!entry.name.toLowerCase().endsWith('.pem'))continue;const raw=await entry.async('string');const key=createPublicKey(raw);if(key.asymmetricKeyType!=='rsa')throw Error('Expected an RSA signing key');const pem=key.export({type:'spki',format:'pem'}).toString(),fingerprint=createHash('sha256').update(key.export({type:'spki',format:'der'})).digest('hex');
   const dates=[...row.GenPeriod.matchAll(/(\d{2})\/(\d{2})\/(\d{4})/g)].map(m=>`${m[3]}-${m[2]}-${m[1]}`);
   keys.push({issuer,environment,pem,fingerprint,validFrom:dates[0],validTo:dates[1]||'',source:url,metadataSource:source});
  }
 }
}
if(keys.length<8)throw Error('Official key set is incomplete');
writeFileSync('packages/core/irp-keys.ts','// Retrieved from NIC public signing-key downloads on 2026-10-30.\nexport const IRP_KEYS='+JSON.stringify(keys,null,2)+' as const;\n');
console.log(keys.length+' official NIC signing-key versions downloaded and parsed.');
