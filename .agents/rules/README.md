# Cal.com Engineering Rules

This directory contains modular, machine-readable engineering rules derived from [Cal.com's Engineering Standards for 2026 and Beyond](https://cal.com/blog/engineering-in-2026-and-beyond).

## Structure

Rules are organized by section prefix, as defined in `_sections.md`:

| Prefix | Section | Impact |
|--------|---------|--------|
| `architecture-` | Architecture | CRITICAL |
| `quality-` | Code Quality | CRITICAL |
| `data-` | Data Layer | HIGH |
| `api-` | API Design | HIGH |
| `performance-` | Performance | HIGH |
| `testing-` | Testing | MEDIUM-HIGH |
| `patterns-` | Design Patterns | MEDIUM |
| `culture-` | Team Culture | MEDIUM |

## Files

- `_sections.md` - Defines all sections, their ordering, and impact levels
- `_template.md` - Template for creating new rules
- `{section}-{rule-name}.md` - Individual rule files

## Rule Format

Each rule file follows a consistent format with YAML frontmatter:

```markdown
---
title: Rule Title Here
impact: CRITICAL | HIGH | MEDIUM | LOW
impactDescription: Optional description (e.g., "20-50% improvement")
tags: tag1, tag2, tag3
---

## Rule Title Here

**Impact: LEVEL (optional description)**

Brief explanation of the rule and why it matters.

**Incorrect (description):**
\`\`\`typescript
// Bad code example
\`\`\`

**Correct (description):**
\`\`\`typescript
// Good code example
\`\`\`

Reference: [Link](url)
```

## Adding New Rules

1. Copy `_template.md` to a new file with the appropriate section prefix
2. Fill in the frontmatter (title, impact, tags)
3. Write a clear explanation of the rule
4. Provide incorrect and correct code examples
5. Add a reference link if applicable

## Usage

These rules are designed to be:
- **Human-readable**: Engineers can browse and learn from them
- **Machine-readable**: AI agents can parse and apply them
- **Modular**: Individual rules can be updated without affecting others
- **Versionable**: Changes are tracked in git history

## Core Principles

From the blog post, our engineering philosophy is:

> We are building infrastructure that must almost never fail. To achieve this, we move fast while shipping amazing quality software with no shortcuts or compromises.

The rules in this directory encode the specific practices that enable this philosophy.
