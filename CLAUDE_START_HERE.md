# CLAUDE START HERE

Read this first when reconnecting to the repository.

## Active blocker

- Branch: `feature-calls-runtime-diagnostics`
- Investigation: OBD Appels / calls runtime diagnostics
- Last analyzed commit: `a8cbb1b722b308094bed41527856392ba7d2dd9f`
- Last analyzed run: `27133682666`
- Artifact: `obd-e2e-evidence`
- Current error: `SyntaxError: Illegal return statement`
- Current suspect: `core/guardian-loop.js`
- Expected next action: fix `guardian-loop.js`, rerun CI, inspect the new artifact.

## Read order

1. `docs/CURRENT-INVESTIGATION.md`
2. `docs/SESSION-LOG.md`
3. `docs/OBD-RECOVERY-PROTOCOL.md`
4. Latest failed GitHub Actions run
5. Artifact `obd-e2e-evidence`
6. `diagnostic-artifacts/playwright-output.log`

## Absolute rule

Never code from memory or hypothesis.

Always:

1. Open the latest failed run.
2. Download `obd-e2e-evidence`.
3. Read `diagnostic-artifacts/playwright-output.log`.
4. Fix only the first real error.
5. Rerun CI.
6. Update `docs/CURRENT-INVESTIGATION.md` and `docs/SESSION-LOG.md`.

## Do not do yet

- Do not build `CallScreen` yet.
- Do not refactor `calls.js` yet.
- Do not integrate `callsRuntime` into `core/mobile-autotest.js` yet.
- Do not simplify `core/calls-runtime-diagnostics.js` unless logs prove timeout or performance issues.
