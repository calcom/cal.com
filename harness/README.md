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

## GitHub MCP

The official GitHub MCP remote server is configured in `.mcp.json`. It is used **read-only** (list/read issues). All writes (comments, PR creation) use the `gh` CLI so the token scope is clear and auditable.

The server authenticates via the `GITHUB_TOKEN` env var. Supply it at session start:

```bash
export GITHUB_TOKEN=$(gh auth token)
```
