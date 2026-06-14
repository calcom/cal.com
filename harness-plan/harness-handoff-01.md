# Handoff: cal.diy Agent Harness Exercise

**Date**: 2026-06-14
**Repo**: `/Users/fernandoferreira/workspace/cal.diy` (Yarn/Turbo monorepo, branch `main`, clean tree)
**Purpose of repo**: learning sandbox for LLM/agent-assisted development — Jaya AI Engineering course, final exercise *"Plugar um harness no cal-diy"*: build a semi-autonomous harness that reads a task from an external system via MCP, implements it with coordinated agents, and takes it to PR.

## ⚠️ Status: PLANNING ONLY — nothing is built yet

No harness code exists on disk. There is **no** `harness/` dir, **no** `.mcp.json`, **no** `/quality-gate` skill. The deterministic quality gate (issue #6) is a **new** thing to write, not an existing one to reuse. The only artifact produced so far is this handoff doc under `harness-plan/` (untracked). The entire plan currently lives as **GitHub issues** + a project-memory file. The next session's job is to start building.

## How to start the next session (entry point)

1. List the work:

   ```bash
   gh issue list --repo fernandodof/cal.diy --label harness --state open --json number,title
   ```

2. **Ask the user which issue number they want to work on.** Do not auto-pick.
3. Validate it is startable before doing anything else:

   ```bash
   harness/scripts/can-start.sh <issue-number>   # once #11 is built (see below)
   ```

   The script exits 0 = STARTABLE (all `Blocked by` issues closed), 1 = BLOCKED (prints which blockers are still open). **Until #11 exists**, do the same check manually: read the issue's `Blocked by` section and confirm each referenced issue is CLOSED via `gh issue view <n> --json state`.
4. If blocked, report the open blockers to the user and stop. If startable, read the full issue body (`gh issue view <n> --repo fernandodof/cal.diy`) and begin.

**Build #11 first** — it is the bootstrap for steps 3 above and has no blockers.

## What was done (previous sessions)

1. **Grilling session completed** (via /grill-me): every design branch resolved with the user. Full agreed design recorded in:
   - Project memory: `/Users/fernandoferreira/.claude/projects/-Users-fernandoferreira-workspace-cal-diy/memory/harness-exercise-plan.md` (read this first)
   - GitHub issues #4–#11 (canonical plan, see below)
2. **Repo/GitHub housekeeping**:
   - Remotes swapped: `origin` = `fernandodof/cal.diy` (user's fork), `upstream` = `calcom/cal.diy`
   - Issues **enabled** on the fork (forks default to disabled)
   - Label `harness` created on the fork
3. **Plan published as 8 dependency-ordered GitHub issues** on `fernandodof/cal.diy`, label `harness`. Full specs + acceptance criteria live in each issue body — do not duplicate; read with `gh issue view <n> --repo fernandodof/cal.diy`:
   - **#11 Bootstrap: `can-start.sh` startability script — no blockers, BUILD FIRST**
   - #4 Foundation: `harness/` layout, GitHub MCP in `.mcp.json`, delete accidental `quality-gate/` dir — no blockers
   - #5 Issue template + 2–3 seeded demo issues (HITL: user picks tasks) — blocked by #4
   - #6 `/quality-gate` skill + deterministic check script (NEW code) — blocked by #4
   - #7 researcher/implementer/reviewer agent definitions — blocked by #4
   - #8 Hook-enforced approval gates (token files + PreToolUse hook) — blocked by #4
   - #9 Hybrid eval (rubric script + LLM judge), 3-retry cap — blocked by #6, #7
   - #10 `/work-on-issue` orchestrator (interactive entry point) + end-to-end demo (HITL) — blocked by #5–#9, #11

## Key design decisions (summary — details in memory file + issues)

- Harness = **Claude Code itself**, configured in-repo; **deterministic scripts wherever possible** (user's explicit principle — this is why startability and quality checks are scripts, not LLM judgment)
- GitHub MCP server **reads** issues; `gh` CLI does all **writes** (comments, PR) and bootstrap queries
- Orchestrator + least-privilege subagents in `.claude/agents/` (researcher read-only, implementer full, reviewer read-only/LLM judge)
- Gates enforced **by construction**: approval token files in `.harness/runs/<issue>/approvals/`, PreToolUse hook blocks `git push`/`gh pr create` without them
- Eval = deterministic rubric + reviewer JSON judge; fail → feedback to implementer, **max 3 attempts**
- Layout: skills/agents/hooks under root `.claude/`; scripts + eval under top-level `harness/`; `.harness/` gitignored
- PRs: draft mode, conventional commits, against `origin/main` — per repo CLAUDE.md

## Repo facts worth knowing

- `gh` is authenticated as `fernandodof`
- `.claude/settings.json` has `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` set, but the design deliberately chose **subagents, not agent teams**
- The accidental dir `quality-gate/.claude/hooks/.claude/settings.local.json` still exists — deleting it is part of #4
- The `harness-task` label (referenced by #5) does **not** exist yet — it's created within #5
- Existing skills in `.claude/skills/`: calcom-api, vercel-react-best-practices, web-design-guidelines (unrelated to harness)
- Repo CLAUDE.md is strict: PR limits (<500 lines/<10 files), no `as any`, Prisma `select` only, no barrel imports, `TZ=UTC yarn test`, `yarn type-check:ci --force`

## What's next

User invoked this handoff with **/grill-me** as the next-session focus: they want to be **grilled on the implementation details of the next slice before building it**. Most likely starting points: #11 (bootstrap script) or #4 (foundation).

Open implementation questions worth grilling on for #4:

- Which GitHub MCP server flavor: remote (`https://api.githubcopilot.com/mcp/`) vs local Docker — and how the token is supplied (env var vs `gh auth token`)
- Read-only toolset restriction for the MCP server (it has write tools; design says writes go via `gh`)
- Whether `.mcp.json` is committed (it's the point of the exercise — likely yes, with token via env)
- `harness/README.md` scope — skeleton now vs filled in at #10

## Suggested skills

- `/grill-me` — the user's explicitly requested mode: interview them on the next slice's design before implementing
- `/tdd` — for the deterministic scripts (`can-start.sh`, quality-gate checks, eval scorer, hook script) once building starts
- `/code-review` — before each slice's PR
- `/verify` — to prove acceptance criteria (e.g. hook actually blocks `git push` without tokens; `can-start.sh` correctly flags #5 as blocked)

No secrets in this doc; the `gh` token lives in the system keyring.
