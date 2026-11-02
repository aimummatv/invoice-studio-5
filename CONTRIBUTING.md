# Working on Invoice Studio

Invoice Studio 5 business records and import documents belong outside the repository, under the private Documents workspace. Use synthetic data for tests, evidence and screenshots. Run `npm run check:privacy` before publication and enable the local guard with `git config core.hooksPath .githooks`. The private reference used for the check is never committed. Keep source and software-only release assets synchronized; never include local settings exports, business databases or rollback bundles in a release.

1. Clone the repository and run `npm ci` with Node 24 on Windows.
2. Create a feature branch; keep the finalized release baseline separate from new work.
3. Run `npm run typecheck`, `npm test` and `npm run build` before opening a pull request.
4. For presentation, compliance, recovery or storage changes, also run the corresponding desktop tests and inspect rendered PDFs.
5. Record the change and actual verification in release notes. Do not claim portal acceptance or physical printing without exercising those paths.

## Data preservation

Never commit databases, customer exports, user profiles, recovery files, private keys, API credentials, PINs, account tokens or the active demo checkpoint. Keep financial snapshots and original issued PDFs immutable. Tests must use isolated temporary data. Do not remove or restore the actual demo session as part of development verification.

## Government workflow

The current release remains TEST-only. v4-13 is approved but paused. Implement it on a dedicated branch after explicit resumption. Do not enable live registration by merely removing TEST guards, copying demo records or treating generated sample references as government evidence.

## Packaging

`npm run dist:win` builds Windows distribution artifacts. Release a verified package alongside the previous installed program and retain rollback capability. GitHub source updates do not migrate or replace local user data automatically.

## CI template

`docs/ci/windows-ci.yml` is ready for activation by an account/token with workflow-write permission. Move it to `.github/workflows/windows-ci.yml` to run on pushes and pull requests. Until then, run the documented checks locally; no automated GitHub CI result is claimed.
