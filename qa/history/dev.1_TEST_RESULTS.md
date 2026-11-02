# Actual test results

 **56/56 tests passed; 0 failed; 0 skipped**. Baseline v3 core/store: 21 passed. These are Node/Linux tests. Source parsing, 10k register count/integrity and synthetic backup restore also verified.

The initial v3 recovery suite cannot load ExcelJS. Strict typecheck: tsc not installed. Full build: Vite unavailable. Desktop test: no built Electron app. Screenshot attempt: Chromium SIGTRAP / setsockopt denied. Windows validation: unavailable. Logs contain actual failures; none are claimed passed.

Performance fix: full 10k register 17340 ms → 136.3 ms; issue p95 1.56 ms; generation 11.0s. See recorded memory and environment in qa/logs/performance.json.



| Command | Verdict | Evidence |
|---|---|---|
| npm test | PASS for included service suites only | qa/logs/v4-offline-tests.tap |
| v3 core/store baseline | 21 PASS | qa/logs/v3-available-tests.tap |
| v3 recovery/workbook | BLOCKED missing ExcelJS | qa/logs/v3-baseline-tests.tap |
| npm run lint | source parse PASS; not strict check | qa/logs/source-parse.log |
| npm run typecheck | BLOCKED missing tsc | qa/logs/typecheck.log |
| npm run build | BLOCKED missing Vite | qa/logs/build.log |
| npm run test:desktop | BLOCKED missing built app | qa/logs/desktop.log |
| 10k benchmark | measured; register/integrity counts verified | qa/logs/performance.json |
| Screenshots/PDF visual/Windows/Google official | NOT VERIFIED | qa/SCREENSHOT_INDEX.md |
