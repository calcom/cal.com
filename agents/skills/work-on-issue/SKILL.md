---
name: work-on-issue
description: Full harness orchestrator. Reads a GitHub issue, runs the researcher → plan-gate → implementer → eval (3-retry) → PR-gate → draft-PR pipeline. Use when the user says "/work-on-issue [number]" or asks to work on a harness issue end-to-end.
---

# /work-on-issue

End-to-end harness orchestrator. Coordinates researcher, implementer, and reviewer subagents with two human approval gates and a 3-attempt eval retry loop.

---

## Step 0 — Resolve the issue number

If the user provided a number (e.g. `/work-on-issue 12`), use it.  
If no number was given, ask:

> Which issue number should I work on?

Validate the input is a positive integer before continuing.

---

## Step 1 — Startability check

```bash
bash harness/scripts/can-start.sh <issue>
```

- Exit 0 → STARTABLE, continue.
- Exit 1 → BLOCKED. Read the output, list the open blockers to the user, and **stop**.
- Exit 2 → error fetching issue; report and stop.

---

## Step 2 — Read the issue

Fetch the issue body and title via the GitHub MCP or `gh`:

```bash
gh issue view <issue> --json number,title,body,labels
```

Extract:
- Title
- Full body (approach, acceptance criteria, constraints, blocked-by)

---

## Step 3 — Researcher agent

Spawn the **researcher** subagent with:

```
Issue number: <n>
Issue body:
<full body>
```

The researcher will explore the codebase and write its plan to `.harness/runs/<issue>/plan.md`.  
Wait for it to finish, then read the plan back and summarise it to the user.

---

## Step 4 — Gate 1: plan approval

Present the plan summary to the user and ask:

> Do you approve this plan? (yes / no / revise)

- **yes** → write the approval token and continue:
  ```bash
  mkdir -p .harness/runs/<issue>/approvals
  touch .harness/runs/<issue>/approvals/plan-approved
  ```
- **no / revise** → ask what should change, update the plan file, and re-ask. Do **not** proceed until the user explicitly says yes.

---

## Step 5 — Implementer agent

Spawn the **implementer** subagent with:

```
Issue number: <n>
Plan path: .harness/runs/<issue>/plan.md
```

Wait for it to finish.

---

## Step 6 — Quality gate

Run the quality gate skill inline:

```bash
bash harness/scripts/quality-gate
```

Read `.harness/reports/quality-gate.json` and show the user a summary table (check name, ✓/✗, message).  
If FAIL, show the action items. The implementer should fix them before the eval runs — loop back to Step 5 if needed (counts against the 3-attempt cap).

---

## Step 7 — Hybrid eval with retry loop

```bash
bash harness/eval/run-with-retry --issue <n> --base main
```

This script:
1. Runs the deterministic rubric (`harness/eval/rubric`)
2. Reads `.harness/runs/<n>/review.json` (written by the reviewer agent — spawn it now if not present)
3. Combines scores via `harness/eval/score`
4. On PASS: writes `.harness/runs/<n>/approvals/pr` and exits 0
5. On FAIL: prints structured feedback and exits 1 (up to 3 total attempts)

**If the reviewer agent has not yet run**, spawn it before calling `run-with-retry`:

```
Issue number: <n>
Issue body: <full body>
```

On eval FAIL with attempts remaining, show the implementer the feedback and loop back to Step 5.  
On eval FAIL after 3 attempts, surface the full report to the user and **halt** — human intervention required.

---

## Step 8 — Gate 2: pre-PR approval

Show the user:
- Combined eval score
- Rubric results
- Reviewer verdict summary

Then ask:

> The eval passed (score: X/100). Ready to open a draft PR? (yes / no)

- **yes** → the `approvals/pr` token was written by `run-with-retry`; continue.
- **no** → ask what needs to change; loop back to Step 5 if revisions needed.

---

## Step 9 — Branch, commit, push, open draft PR

```bash
# Create branch (if not already on one named after the issue)
git checkout -b harness/issue-<n>-<slug>

# Commit (conventional format)
git add -A
git commit -m "feat(harness): <short description from issue title>"

# Push — approval-gate hook will allow this because approvals/pr exists
git push -u origin harness/issue-<n>-<slug>

# Open draft PR
gh pr create --draft \
  --title "feat(harness): <issue title>" \
  --body "Closes #<n>\n\n<one-paragraph summary of what was built>"
```

---

## Step 10 — Post issue comment

```bash
gh issue comment <n> --body "$(cat <<'EOF'
Draft PR opened: <pr-url>

**Eval score**: <combined>/100  
**Rubric**: PASS  
**Reviewer**: PASS  

<one-sentence summary of the implementation>
EOF
)"
```

---

## Step 11 — Done

Report to the user:
- PR URL
- Issue comment URL  
- Eval score
- Any notes on gate interactions during the run
