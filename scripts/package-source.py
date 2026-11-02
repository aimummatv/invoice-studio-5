"""Create a source-only owner handover. Never builds, tests, runs or uploads the app."""
from pathlib import Path
import hashlib,json,shutil,subprocess,zipfile,datetime

SOURCE=Path(__file__).resolve().parents[1]
OUTPUT=SOURCE.parent/'shared'
NAME='Invoice-Studio-4-Source-Handover'
VERSION=json.loads((SOURCE/'package.json').read_text())['version']
STAGE=OUTPUT/(NAME+'-'+VERSION)
if STAGE.exists():
    raise SystemExit('A handover folder already exists. Choose a new versioned output or move the prior folder before repackaging.')
STAGE.mkdir(parents=True)
excluded={'.git','node_modules','dist','.npm-cache','__pycache__','artifacts','pc-results'}
files=[]
for file in sorted(SOURCE.rglob('*')):
    if not file.is_file() or file.is_symlink(): continue
    rel=file.relative_to(SOURCE)
    if any(part in excluded for part in rel.parts): continue
    if file.name.startswith('.env') or file.suffix.lower() in {'.pem','.key','.is4b','.exe','.db','.sqlite'} or '.sqlite-' in file.name or '.db-' in file.name: continue
    if 'credentials' in file.name.lower() and file.suffix.lower()=='.json': continue
    # Keep historic reports, but exclude executable test outputs and runtime data.
    if rel.parts[:2] in {('qa','evidence')} and file.suffix.lower() not in {'.md','.txt','.json'}: continue
    dest=STAGE/'Source'/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(file,dest);files.append(str(rel))

(STAGE/'Documentation').mkdir()
for src,name in [('docs/PC_SETUP_AND_VALIDATION.md','PC-SETUP.md'),('docs/SOURCE_HANDOVER_SCOPE.md','SOURCE-SCOPE.md'),('docs/BACKUP_AND_RECOVERY.md','BACKUP-AND-RECOVERY.md'),('docs/MIGRATION_V3_TO_V4.md','MIGRATION.md'),('docs/GOOGLE_SYNC_SETUP.md','GOOGLE-SETUP.md'),('qa/TEST_PLAN.md','VALIDATION-CHECKLIST.md')]:
    shutil.copy2(SOURCE/src,STAGE/'Documentation'/name)
(STAGE/'QA-Reports').mkdir()
for name in ['TEST_RESULTS.md','SOURCE_PARSE.log','SOURCE_LINKS.log','SOURCE_AUDIT-dev.5.md','V3_REFERENCE_AUDIT.json','REMAINING_FEATURES.md','PROGRESS.md']:
    shutil.copy2(SOURCE/'qa'/name,STAGE/'QA-Reports'/name)
for name in ['FINAL_ACCEPTANCE_MATRIX.md','KNOWN_LIMITATIONS.md','FINAL_HANDOVER_REPORT.md']:
    shutil.copy2(SOURCE/'release'/name,STAGE/'QA-Reports'/name)
(STAGE/'Windows-Tools').mkdir()
shutil.copy2(SOURCE/'scripts/verify-handover.ps1',STAGE/'Windows-Tools/verify-handover.ps1')
commands={
 '00-Verify-Package.cmd':('Windows-Tools\\verify-handover.ps1','',False),
 '01-Install-Dependencies.cmd':('scripts\\prepare-pc.ps1',' -Install',True),
 '02-Run-Developer-App.cmd':('scripts\\start-development.ps1','',True),
 '03-Run-Checks.cmd':('scripts\\check-on-pc.ps1','',True),
 '04-Build-EXE.cmd':('scripts\\build-windows.ps1','',True),
}
for filename,(script,args,enter_source) in commands.items():
    folder='%~dp0Source' if enter_source else '%~dp0'
    body='@echo off\nsetlocal\npushd "'+folder+'"\npowershell -NoProfile -ExecutionPolicy Bypass -File "'+script+'"'+args+'\nset "handoverResult=%ERRORLEVEL%"\npopd\necho.\necho Process exit code: %handoverResult%\npause\nexit /b %handoverResult%\n'
    (STAGE/filename).write_bytes(body.replace('\n','\r\n').encode('utf-8'))

readme=f'''# Invoice Studio 4 — start here

Version **{VERSION}**. This is your requested source handover, not a ready-to-install EXE.

1. Extract the whole ZIP to a local Windows folder.
2. Install Node.js 24 LTS x64 from https://nodejs.org.
3. Run `01-Install-Dependencies.cmd`, then `02-Run-Developer-App.cmd`.
4. Use `03-Run-Checks.cmd` for the deferred PC checks. See `Documentation/PC-SETUP.md` for Electron screenshots and EXE packaging later.

Open **START-HERE.html** for a readable offline guide. Run `00-Verify-Package.cmd` to check file hashes before changing source.

## Contents

- `Source/`: complete v4 source, original plans, dependencies manifest, existing tests, scripts and documentation. No node_modules, data, credentials or compiled binaries.
- `Documentation/`: PC setup, source scope, backup, migration, Google and validation instructions.
- `QA-Reports/`: actual verification status and deferred gates.
- `Windows-Tools/`: package integrity verifier.
- `Checksums.txt` and `Package-Manifest.json`: package identity and per-file hashes.

## What is still deferred

Business/Google/tax/backup configuration; dependency resolution and strict compilation; unit/integration/security/recovery tests and fixes; app/screenshots/PDF inspection; EXE/portable building and Windows validation; real-data/CA/owner acceptance. The latest source has only been syntax-parsed, not run or tested. Older passing results are historical.

Nothing was published or pushed to GitHub. v3 was not modified. This package remains TEST-only. Start with fictitious records and keep v3/data separate.
'''
(STAGE/'README-FIRST.md').write_text(readme)
html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invoice Studio 4 — source handover</title><style>:root{font-family:Segoe UI,Arial,sans-serif;color:#173b31;background:#edf3ef}*{box-sizing:border-box}body{margin:0;padding:40px 20px}main{max-width:1050px;margin:auto}.tag{font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:#226447}.hero{padding:40px;border-radius:18px;background:#fff;border:1px solid #d8e6dd;box-shadow:0 12px 40px #1030240a}h1{font-size:42px;letter-spacing:-1.5px;margin:14px 0}p{line-height:1.7;color:#4d665b}.badge{display:inline-block;background:#fff5db;color:#7a5816;border:1px solid #ead9a9;border-radius:30px;padding:7px 12px;font-size:12px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:20px}.card{background:#fff;border:1px solid #d8e6dd;padding:26px;border-radius:14px}h2{font-size:21px;margin:0 0 12px}h3{font-size:16px;margin-top:0}li{line-height:1.7;margin:8px 0}a{color:#176848;text-decoration-thickness:1px;text-underline-offset:3px}code{font:13px Consolas,monospace;background:#eef4ef;padding:3px 6px;border-radius:4px;overflow-wrap:anywhere}.step{display:inline-grid;place-items:center;background:#176848;color:white;width:27px;height:27px;border-radius:50%;margin-right:10px}footer{font-size:12px;color:#64796e;margin:24px 0}@media(max-width:680px){.grid{grid-template-columns:1fr}h1{font-size:31px}.hero{padding:25px}}</style><main><section class="hero"><span class="tag">Example Brand · source handover</span><h1>Invoice Studio 4</h1><span class="badge">VERSION · TEST ONLY · PC VALIDATION DEFERRED</span><p>The remaining feature-group implementation is supplied as source, with a clean Windows handover. Install the dependencies on your PC, compile the developer app, then complete the deferred checks. This archive contains no EXE and has not been runtime-tested.</p><a href="README-FIRST.md">Read the package guide</a> &nbsp; · &nbsp; <a href="Documentation/PC-SETUP.md">PC setup and troubleshooting</a></section><div class="grid"><section class="card"><h2>Start on your PC</h2><p><span class="step">1</span>Extract the complete ZIP to a local folder.</p><p><span class="step">2</span>Install <a href="https://nodejs.org">Node.js 24 LTS x64</a>.</p><p><span class="step">3</span>Run <code>01-Install-Dependencies.cmd</code>.</p><p><span class="step">4</span>Run <code>02-Run-Developer-App.cmd</code>.</p><p>Create a TEST Owner and use fictitious records. Keep the console output if compilation or launch fails.</p></section><section class="card"><h2>Then validate</h2><p><code>03-Run-Checks.cmd</code> runs the PC checks and keeps a transcript. Desktop screenshots need the separate command in the PC guide and manual inspection.</p><p><code>04-Build-EXE.cmd</code> packages locally later. It never publishes.</p><a href="Documentation/VALIDATION-CHECKLIST.md">Validation checklist</a><p>Source syntax was checked here; strict types, runtime behavior, financial correctness, screenshots and Windows packaging were not.</p></section><section class="card"><h2>Feature-group source</h2><ul><li>Migration reconciliation and original PDF preservation</li><li>Google master proposals, integrity and reviewed recovery</li><li>Transport/export/compliance evidence</li><li>Stock exceptions and backdated cost reviews</li><li>Editor, catalogue, reports and import controls</li><li>Diagnostic recovery and PC handover tooling</li></ul><a href="Documentation/SOURCE-SCOPE.md">Implementation scope and policy boundaries</a></section><section class="card"><h2>Package integrity & configuration</h2><p>Run <code>00-Verify-Package.cmd</code> before changing files. <code>Checksums.txt</code> contains the per-file SHA-256 manifest.</p><p>Configure Google, tax formats/applicability, postal data and independent backups later. Credentials and business data are not included.</p><a href="QA-Reports/SOURCE_AUDIT-dev.5.md">Audit findings</a> &nbsp; · &nbsp; <a href="QA-Reports/FINAL_ACCEPTANCE_MATRIX.md">Actual acceptance status</a> &nbsp; · &nbsp; <a href="QA-Reports/KNOWN_LIMITATIONS.md">Limitations</a></section></div><footer>Owner source delivery only. Nothing published. v3 remains separate. No production, filing or cutover approval is implied.</footer></main></html>'''
(STAGE/'START-HERE.html').write_text(html.replace('VERSION',VERSION,1))
try: commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=SOURCE,text=True).strip()
except (subprocess.SubprocessError,FileNotFoundError): commit='source-archive'
manifest={'name':NAME,'version':VERSION,'sourceCommit':commit,'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceFileCount':len(files),'kind':'source-only TEST handover','appTestsRun':False,'strictTypecheckRun':False,'exeIncluded':False,'screenshotsTaken':False,'externalConfigurationDeferred':True,'published':False}
(STAGE/'Package-Manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
checks=[]
for file in sorted(STAGE.rglob('*')):
    if file.is_file(): checks.append(hashlib.sha256(file.read_bytes()).hexdigest()+'  '+file.relative_to(STAGE).as_posix())
(STAGE/'Checksums.txt').write_text('\n'.join(checks)+'\n')
archive=OUTPUT/(NAME+'-'+VERSION+'.zip')
with zipfile.ZipFile(archive,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for file in sorted(STAGE.rglob('*')):
        if file.is_file(): z.write(file,NAME+'/'+file.relative_to(STAGE).as_posix())
with zipfile.ZipFile(archive) as z:
    bad=z.testzip()
    if bad: raise RuntimeError('ZIP CRC failure: '+bad)
    for line in checks:
        expected,path=line.split('  ',1)
        if hashlib.sha256(z.read(NAME+'/'+path)).hexdigest()!=expected: raise RuntimeError('ZIP content hash mismatch: '+path)
digest=hashlib.sha256(archive.read_bytes()).hexdigest()
(OUTPUT/(archive.name+'.sha256')).write_text(digest+'  '+archive.name+'\n')
verification={'archive':archive.name,'bytes':archive.stat().st_size,'sha256':digest,'packagedFiles':len(checks)+1,'zipCrc':'PASS','perFileSha256Readback':'PASS','applicationValidation':'NOT RUN'}
(OUTPUT/(NAME+'-'+VERSION+'-Archive-Verification.json')).write_text(json.dumps(verification,indent=2)+'\n')
print(json.dumps(verification,indent=2))
