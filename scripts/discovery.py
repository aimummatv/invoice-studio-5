from pathlib import Path
import json,hashlib,re,platform,subprocess
root=Path('/workspace/invoice-studio-4');ref=Path('/workspace/reference/invoice-studio-3.01')
tree=json.loads((root/'docs/reference-tree.json').read_text());manifest=[]
for f in tree['tree']:
 if f['type']!='blob':continue
 p=ref/f['path'];ok=False
 if p.exists():
  raw=p.read_bytes()
  for _ in range(3):
   h=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
   if h==f['sha']:ok=True;break
   if raw.endswith(b'\n'):raw=raw[:-1]
   else:break
  if ok:p.write_bytes(raw)
 manifest.append({'path':f['path'],'git_blob_sha':f['sha'],'present':p.exists(),'verified_git_blob':ok,'sha256':hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else None})
(root/'docs/V3_SOURCE_MANIFEST.json').write_text(json.dumps({'commit':tree['sha'],'files':manifest},indent=2))
plan=next((root/'docs/inputs').glob('2-*')).read_text(); rows=[];sec='0';idx=0
for ln in plan.splitlines():
 m=re.match(r'^#{2,3} (\d+(?:\.\d+)?)\.?\s+(.*)',ln)
 if m:sec=m[1];idx=0
 if ln.startswith(('- ', '| M')) or re.match(r'^\d+\. ',ln):
  idx+=1;rid=f'R-{sec}-{idx:03}';body=ln.replace('|',' / ').strip()
  rows.append(f'| {rid} | {body} | PLANNED | — | — | Owner/CA where specified |')
(root/'docs/REQUIREMENTS_TRACEABILITY.md').write_text('# Requirements traceability\n\nSource: supplied revision 2 plan; stable IDs assigned to numbered requirements and list items. Narrative requirements also remain binding. No milestone is implied complete by a file existing.\n\n| ID | Requirement | Status | Implementation | Verification | Approval |\n|---|---|---|---|---|---|\n'+'\n'.join(rows)+'\n')
print(json.dumps({'reference_files':len(manifest),'hash_verified':sum(x['verified_git_blob'] for x in manifest),'missing':[x['path'] for x in manifest if not x['present']],'requirements':len(rows)}))
