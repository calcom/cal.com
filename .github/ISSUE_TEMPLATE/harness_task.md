---
name: Harness task
about: A scoped implementation task for the AI eval harness
title: "feat|fix|refactor: <short description>"
labels: ["harness-task"]
assignees: ""
---

<!--
  HARNESS TASK — structured for the eval LLM judge.
  Fill in every section. The judge scores the implementer's diff
  against Acceptance criteria and Constraints; vague criteria = meaningless eval.
-->

## Background

<!--
  1–3 sentences of context. Why does this matter? What is the current behaviour?
-->

(Write here.)

## What to build

<!--
  Precise description of the change: what code changes are expected,
  which files are likely touched, and what the end-state looks like.
-->

(Write here.)

## Acceptance criteria

<!--
  REQUIRED — machine-readable checklist.
  Each item must be independently verifiable by reading the diff.
  Use "[ ]" checkboxes exactly as shown.
-->

- [ ] (Criterion 1 — specific and verifiable)
- [ ] (Criterion 2 — specific and verifiable)
- [ ] (Add more as needed)

## Constraints

<!--
  REQUIRED — rules the implementer must respect.
  The judge penalises violations of these constraints.
  Remove any that don't apply; add domain-specific ones as needed.
-->

- Diff stays within CLAUDE.md PR size limits: <500 lines changed, <10 code files
- No `as any` type casting
- `select` instead of `include` in any new Prisma queries
- New logic covered by unit tests (Vitest) at ≥80 % line coverage
- All UI strings go through `t()` for i18n
- Conventional commit title: `feat:`, `fix:`, or `refactor:`

## Reference

<!--
  Links to upstream issue, relevant files, docs, or prior art.
-->

- Upstream: <!-- e.g. https://github.com/calcom/cal.diy/issues/NNNNN -->
- Key file(s): <!-- e.g. packages/platform/stripe/stripe.service.ts:245 -->
