# Windows application download

Current application baseline: **v4-12.2**. See [GitHub Releases](https://github.com/aimummatv/invoice-studio-v4/releases/tag/v4.12.2).

- Portable EXE: run the single downloaded executable; required program files are included and extracted by its launcher.
- Windows ZIP: extract the complete folder; run `Start Invoice Studio.bat` or `Invoice Studio 4.exe`. Keep all program files together.
- No Node.js, npm, separate server or development tools are needed to run the packaged app.
- This is an unsigned Windows x64 TEST build. v4-13 live-workspace/government workflow is still paused.
- Downloads contain no user databases, account credentials, invoice exports or demo checkpoints. Default application data is outside the program directory.
- If you already use a custom Desktop BAT launcher, keep using that launcher for its configured existing profile/data locations. A newly created default profile is separate; it does not delete your earlier records. Back up records before intentionally changing data locations.
- SHA-256 checksums are attached to the release. The ZIP also includes a per-file program manifest.

## Package smoke check for maintainers

With dependencies installed and a Windows desktop available:

```powershell
$env:STUDIO4_PACKAGED_EXE='C:\path\to\Invoice Studio 4.exe'
node scripts/packaged-smoke.mjs
```

The check uses an isolated synthetic workspace, exercises issuance/PDF creation and writes ignored `qa/evidence/package-test.json`. Set `STUDIO4_PACKAGE_RESULT` to choose a different result path. A physical printer and real government registration are not exercised.
