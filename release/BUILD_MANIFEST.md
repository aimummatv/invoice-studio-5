# Source manifest — 4.0.0-dev.5

Target: Windows 10/11 x64, Node.js 24+, Electron/TypeScript/Preact/Vite, isolated TEST data. Schema version 5 adds creation timestamps for new stock movements; old missing times remain null. Templates v4-1 through v4-4 are preserved; v4-5 adds credit/debit original references. Each migration takes a pre-upgrade snapshot.

No compiled binary, dependencies or lockfile are shipped. The first reviewed dependency installation must generate and preserve a lockfile. Build/test/package commands are in the PC guide and Windows scripts.

The archive's Package-Manifest.json records source commit, file count and package metadata. Checksums.txt covers every packaged file except itself. The sibling ZIP checksum covers the archive. Historical reference pin: 9d3537a8188ad03c7186ab721596d5a3a0e394ab. Historical passing-test checkpoint: ca44e7b. Neither is current app validation.
