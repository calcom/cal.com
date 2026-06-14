---
name: quality-gate
description: Run a deterministic quality gate (type-check, Biome lint, unit tests, repo-rule grepping) scoped to changed files and summarize the PASS/FAIL report. Use this after every implementation step or fix iteration in a harness exercise.
---

# Quality Gate

Run the deterministic quality-gate script, then read and summarize its JSON report.

## Steps

### 1. Run the script

```bash
bash harness/scripts/quality-gate [--base <ref>]
```

- `--base <ref>` — git ref to diff against (default: `main`). Pass the branch you forked from if different.
- The script exits **0** on PASS and **1** on FAIL.
- Report is written to `.harness/reports/quality-gate.json`.

### 2. Read the report

After the script finishes, read `.harness/reports/quality-gate.json` and report:

1. **Verdict**: PASS or FAIL (bold)
2. **Summary table** — one row per check with name, status (✓/✗), and message
3. **Action items** — for each failing check, what needs to be fixed
4. **Next step** — either "all checks pass, ready to open PR" or "fix the issues above and re-run `/quality-gate`"

## Checks performed

| Check | Scope | What it catches |
|-------|-------|-----------------|
| `no-as-any` | Changed `.ts`/`.tsx` files | `as any` type casts |
| `no-prisma-include` | Changed `.ts`/`.tsx` files | Prisma `include:` instead of `select:` |
| `no-barrel-ui-import` | Changed `.ts`/`.tsx` files | `from '@calcom/ui'` barrel imports |
| `biome` | Whole repo | Lint and format violations |
| `type-check` | Whole repo (incremental) | TypeScript type errors |
| `unit-tests` | Touched packages only | Failing unit tests |

## When to use

- After finishing an implementation step
- After each fix iteration (the script is designed to be run repeatedly)
- Before opening or updating a PR
- When the eval harness needs a structured PASS/FAIL signal

## Example output summary

```
**Verdict: FAIL** (2/4 checks failed)

| Check              | Status | Notes                                    |
|--------------------|--------|------------------------------------------|
| no-as-any          | ✓      | no violations                            |
| no-prisma-include  | ✗      | 1 violation: packages/trpc/…:42          |
| biome              | ✗      | 3 formatting errors                      |
| type-check         | ✓      | no type errors                           |
| unit-tests         | ✓      | no changed packages to test              |

**Action items:**
1. Replace `include:` with `select:` in `packages/trpc/server/routers/booking.ts:42`
2. Run `yarn biome check --write .` to auto-fix formatting

Re-run `/quality-gate` after fixing.
```
