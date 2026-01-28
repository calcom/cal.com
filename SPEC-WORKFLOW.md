# Spec-Driven Development Workflow

This workflow is **opt-in**. Use it when explicitly requested by saying "use spec-driven development" or "follow the spec workflow".

## Design Documents

The `specs/` folder contains design documents for features in development.

Each spec follows this structure:

```
specs/{feature}/
├── CLAUDE.md           # Feature-specific instructions (read this first)
├── design.md           # The specification
├── implementation.md   # Current status and what's done
├── decisions.md        # Why decisions were made
├── prompts.md          # Reusable prompts
├── future-work.md      # What's deferred
└── docs/               # Documentation with screenshots
```

**Workflow:**

1. Read the spec's `CLAUDE.md` for specific instructions
2. Read `design.md` to understand what we're building
3. Check `implementation.md` for current status
4. Find the relevant code in the codebase
5. Implement in small pieces, update `implementation.md` after each

---

## When Implementing Features (Spec Mode)

1. **Check for design doc** in `specs/` — if it exists, follow it
2. **If no spec exists** — ask if you should create one first
3. **Look at existing patterns** — find similar code and follow conventions
4. **Update implementation.md** — mark what's done after each piece
5. **Update decisions.md** — when choosing between approaches

---

## Creating a New Spec

When user asks to build a new feature:

1. Copy the template: `cp -r specs/_templates specs/{feature-name}`
2. Explore the codebase to understand existing patterns
3. Write `design.md` with technical spec
4. Write `CLAUDE.md` with feature-specific instructions
5. Initialize `implementation.md` with "not-started" status
6. Ask user to review before implementing

---

## Updating Spec Files

### implementation.md — After completing each piece:

```markdown
## Status: in-progress

## Completed
- [x] Database schema
- [x] Migration file

## In Progress
- tRPC endpoints

## Next Steps
1. UI components
2. Tests

## Session Notes
### 2024-01-15
- Done: Added schema, created migration
- Next: Implement tRPC router
```

### decisions.md — When choosing between approaches:

```markdown
## ADR-001: Use Separate Table for Custom Locations

### Context
Need to store user-defined locations.

### Options
1. JSON field — simpler, but harder to query
2. Separate table — more flexible, better indexing

### Decision
Separate table for better querying.

### Consequences
- Need migration
- Need new tRPC router
```

---

## Don't (When Using Spec-Driven Development)

- Don't implement features without checking for a design doc first
- Don't skip updating implementation.md after completing work
- Don't make architectural decisions without recording them in decisions.md
