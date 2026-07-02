# Cal.diy Agent Harness

Semi-autonomous development harness built on top of Claude Code. An orchestrator skill reads a task from GitHub, coordinates specialist subagents, and takes the work to a draft PR — with two human approval gates along the way.

## Entry point

```bash
/work-on-issue <issue-number>
```

## Flow

```
Read task (GitHub MCP)
  ↓
can-start.sh <n>  — exits 1 if open blockers; abort here
  ↓
Researcher agent — reads issue, codebase, produces plan
  ↓
[GATE 1: human approves plan]
  ↓
Implementer agent — writes code, commits
  ↓
Quality gate (/quality-gate skill)
  ↓   type-check · biome · TZ=UTC tests · repo-rule greps
  ↓
Reviewer agent + rubric scorer — eval against acceptance criteria
  ↓   fail → feedback to implementer (max 3 attempts)
  ↓
[GATE 2: human approves PR]
  ↓
gh pr create (draft)
```

## Human approval gates

Gates are enforced by construction — not by trust. The orchestrator calls `AskUserQuestion`, writes a token file to `.harness/runs/<issue>/approvals/` when the user confirms, and a `PreToolUse` hook blocks `git push` / `gh pr create` until both tokens exist.

- `plan_approved` — written after gate 1; unlocks the implementer agent
- `pr_approved` — written after gate 2; unlocks `gh pr create`

## Directory layout

```
harness/
  scripts/        # Deterministic shell scripts (can-start.sh, quality-check.sh, …)
  eval/           # Rubric definitions and scorer
  README.md       # This file

.claude/
  agents/         # Subagent definitions (researcher, implementer, reviewer)
  skills/         # Orchestrator and quality-gate skills
  hooks/          # PreToolUse hook enforcing approval gates
  settings.json   # Permissions and env

.harness/         # Runtime state — gitignored
  runs/<issue>/
    approvals/    # Token files (plan_approved, pr_approved)
    reports/      # Quality-gate and eval JSON output
```

## Scripts

| Script | Purpose |
|--------|---------|
| `harness/scripts/can-start.sh <n>` | Exits 0 if issue `n` has no open blockers, 1 otherwise |

## Skills

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `/work-on-issue [n]` | User says "work on issue N" | End-to-end orchestrator |
| `/quality-gate` | After implementation step | Deterministic lint/type/test check |

## GitHub MCP

The official GitHub MCP remote server is configured in `.mcp.json`. It is used **read-only** (list/read issues). All writes (comments, PR creation) use the `gh` CLI so the token scope is clear and auditable.

The server authenticates via the `GITHUB_TOKEN` env var. Supply it at session start:

```bash
export GITHUB_TOKEN=$(gh auth token)
```

---

## Demo run — issue #18 (2026-06-30)

End-to-end run of `/work-on-issue 18` against the seeded demo issue [fix: mobile UI overflow in 'Avoid meeting overload / Notice and buffers' card](https://github.com/fernandodof/cal.diy/issues/18). Draft PR: https://github.com/fernandodof/cal.diy/pull/23.

| Step | Outcome |
|------|---------|
| `can-start.sh 18` | STARTABLE |
| Researcher | Identified root cause in `EventLimitsTab.tsx`; wrote plan |
| **Gate 1** | Human **approved** plan |
| Implementer | Applied Tailwind fix (4 lines, 1 file) |
| Eval attempt 1 | Rubric FAIL (pre-existing repo-wide biome on `main`); Review PASS 88/100; Combined 83/100 |
| **Gate 2** | Human **approved** — confirmed biome failure pre-dates this change |
| Push + PR | Draft PR #23 opened, closes #18 |

**Gate rejection path demonstrated**: Gate 2 surfaced the rubric failure with context. The human inspected the eval report, confirmed the biome issue was pre-existing, and approved. This exercises the "reject → review → re-approve" decision point without requiring a full re-implementation loop.
