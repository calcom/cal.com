# Spec-First Development

This folder contains design documents for features in development. Claude reads these to understand what to build and track progress.

## How It Works

1. **Before implementing a feature**, create a spec folder with design docs
2. **Claude reads the design** before writing any code
3. **Progress is tracked** in implementation.md for session continuity
4. **Decisions are recorded** in decisions.md for future reference
5. **Docs are generated** with screenshots when feature is complete

## Starting a New Feature

```bash
cp -r specs/_templates specs/{feature-name}
```

Then tell Claude:
```
"I want to build {feature}. Here's my idea: [description].
Review the codebase and fill in specs/{feature}/design.md"
```

## File Structure

Each feature has:

| File/Folder | Purpose |
|-------------|---------|
| `CLAUDE.md` | Instructions for Claude when working on this feature |
| `design.md` | Source of truth - what to build and how |
| `implementation.md` | Progress tracking - what's done, in progress, blocked |
| `decisions.md` | Architecture Decision Records (ADRs) |
| `prompts.md` | Reusable prompts for common tasks |
| `future-work.md` | Deferred ideas and enhancements |
| `docs/` | Internal documentation with screenshots |
| `docs/screenshots/` | Screenshots captured during development |

## Session Continuity

When starting a new Claude session:
```
"Continue working on {feature}"
```

Claude will read `implementation.md` to pick up where it left off.

## Generating Documentation

When a feature is ready for documentation:
```
"Generate docs with screenshots for {feature}"
```

Claude will:
1. Open the feature in browser
2. Take screenshots of key UI states
3. Save to `specs/{feature}/docs/screenshots/`
4. Update `specs/{feature}/docs/README.md`

## Promoting to Public Docs

When internal docs are ready for customers:
```
"Promote {feature} docs to public"
```

Claude will:
1. Copy content to `docs/{feature}.mdx` (Mintlify format)
2. Move screenshots to `docs/images/{feature}/`
3. Update `docs/mint.json` navigation
4. Adjust language for customer audience

## The Most Important Rule

Every PR must be reviewable in under 10 minutes:
- Max 5-7 files changed (excluding tests)
- Max 500 lines changed
- One focused change per PR

If your change is bigger, split it into multiple PRs.
