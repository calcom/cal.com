<!--
═══════════════════════════════════════════════════════════════════════════════
SYNC IMPACT REPORT
═══════════════════════════════════════════════════════════════════════════════

VERSION CHANGE: 1.0.0 → 1.1.0

RATIONALE: Added Fork Independence Policy to Governance section, clarifying that
this fork operates independently and will not contribute changes back to the
original Cal.com repository.

MODIFIED PRINCIPLES:
  - None

ADDED SECTIONS:
  - Governance > Fork Independence Policy

REMOVED SECTIONS:
  - None

TEMPLATES REQUIRING UPDATES:
  ✅ plan-template.md - Reviewed (No changes needed - principles unchanged)
  ✅ spec-template.md - Reviewed (No changes needed - principles unchanged)
  ✅ tasks-template.md - Reviewed (No changes needed - principles unchanged)
  ✅ agent-file-template.md - Reviewed (No changes needed)
  ✅ checklist-template.md - Reviewed (No changes needed)

FOLLOW-UP TODOS:
  - None

VALIDATION CHECKLIST:
  ✅ No remaining unexplained bracket tokens
  ✅ Version line matches report (1.1.0)
  ✅ Dates in ISO format (YYYY-MM-DD)
  ✅ Principles are declarative and testable
  ✅ MUST/SHOULD rationale provided where appropriate

═══════════════════════════════════════════════════════════════════════════════
-->

# Cal.com Constitution

## Core Principles

### I. Code Readability & Simplicity

Every feature and implementation MUST prioritize clean, easy-to-read code.

**Rules:**

- Code MUST be written with clarity as the primary objective
- Implementations MUST favor straightforward solutions over clever optimizations unless performance requirements explicitly demand otherwise
- Variable, function, and class names MUST be descriptive and self-documenting
- Complex logic MUST be broken down into smaller, understandable units
- Code MUST follow consistent formatting and style conventions
- Magic numbers and unclear constants MUST be replaced with named constants

**Rationale:** Cal.com is an open-source project that benefits from community contributions. Simple, readable code lowers the barrier to entry for new contributors, reduces bugs, accelerates code reviews, and improves long-term maintainability.

### II. Beginner-Friendly Documentation

All code MUST be documented assuming readers are relative newcomers to full-stack development.

**Rules:**

- Technical concepts MUST be explained in plain language
- Assume readers have basic programming knowledge but limited experience with Cal.com's specific tech stack (Next.js, tRPC, React, Prisma)
- Complex patterns or advanced techniques MUST include explanatory context
- README files and inline documentation MUST provide examples and use cases
- Avoid jargon without explanation; when domain-specific terms are necessary, define them
- Code examples MUST be complete and runnable where possible

**Rationale:** Cal.com's mission includes democratizing scheduling infrastructure. By making the codebase accessible to developers at various skill levels, we expand our contributor base, improve educational value, and ensure the project remains approachable for organizations considering self-hosting.

### III. File Consolidation

Features MUST be consolidated into as few files as reasonably possible without sacrificing clarity.

**Rules:**

- Prefer single-file implementations for small to medium features
- Only split into multiple files when a single file exceeds 500 lines OR when distinct concerns clearly justify separation
- Related functionality MUST be co-located unless separation improves testability or reusability
- Avoid premature abstraction—start with a single file and refactor only when complexity demands it
- When splitting is necessary, provide clear module/file naming that indicates purpose and relationships

**Exceptions:**

- Tests MUST be in separate files from implementation
- Configuration files that are required by tooling to be separate
- Platform-specific integrations where external requirements dictate structure

**Rationale:** Excessive file proliferation increases cognitive load when navigating the codebase. Consolidation reduces context switching, makes feature boundaries clearer, and simplifies code review by keeping related logic visible together. This is especially valuable for newcomers who can grasp features holistically.

### IV. Comprehensive Comments

All non-trivial code MUST include explanatory comments that clarify intent and context.

**Rules:**

- Every function MUST have a comment explaining what it does, key parameters, and return values (use JSDoc/TSDoc format where applicable)
- Comments MUST explain **why** decisions were made, not just what the code does
- Non-obvious business logic MUST be documented with rationale
- Edge cases and known limitations MUST be noted in comments
- Complex algorithms or data transformations MUST include step-by-step explanations
- When referencing external documentation (RFCs, API specs, tutorials), include links in comments

**Avoid:**

- Redundant comments that simply restate code (e.g., `// increment counter` above `counter++`)
- Outdated comments—update comments when code changes

**Rationale:** Comments are critical teaching tools for newcomers and essential references for maintainers. Well-commented code reduces onboarding time, minimizes misunderstandings, and preserves institutional knowledge about design decisions.

## Development Standards

### Code Review Requirements

- All pull requests MUST pass code review with explicit verification of compliance with Core Principles I-IV
- Reviewers MUST reject PRs that introduce unnecessary complexity or insufficient documentation
- Simplicity objections (Principle I) override performance optimizations unless benchmarks demonstrate clear need
- File count increases (violating Principle III) require written justification in PR description

### Testing & Quality

- New features MUST include tests as specified in feature requirements
- Tests MUST be readable and serve as documentation (Principle II applies to test code)
- Integration tests MUST be provided for contract changes and inter-service communication
- Test failures MUST block merges

### Documentation Requirements

- Every new feature MUST update relevant README or docs files
- API changes MUST update OpenAPI/Swagger definitions or equivalent documentation
- Breaking changes MUST include migration guides for users

## Quality Gates

Before merging any code, the following MUST be verified:

1. **Simplicity Check**: Could this be simpler? Is complexity justified?
2. **Readability Check**: Can a newcomer understand this code without prior Cal.com experience?
3. **File Count Check**: Could related files be consolidated?
4. **Comment Check**: Are comments present, current, and explain **why** not just **what**?
5. **Test Check**: Are tests present (if required), passing, and readable?

## Governance

### Fork Independence Policy

This repository is a **private fork** of the Cal.com open-source project for evaluation, customization, and self-hosted deployment purposes.

**Policy:**

- This fork operates **independently** from the upstream Cal.com repository
- Changes, features, and tools developed in this fork MUST NOT be pushed or contributed back to the original Cal.com repository
- This fork is maintained solely for personal/organizational use as a self-hosted Calendly alternative
- No obligation exists to maintain compatibility with upstream Cal.com updates
- Upstream changes MAY be selectively merged into this fork at the discretion of the fork maintainers
- This fork's constitution, development practices, and tooling are independent of upstream governance

**Rationale:** This fork serves as a learning and evaluation environment for understanding Cal.com's architecture and testing custom feature development. Operating independently allows for experimental changes, custom tooling (like the `.specify/` workflow system), and organizational-specific customizations without concerns about upstream compatibility or contribution requirements. This policy ensures clarity that development efforts are focused on internal needs rather than open-source contribution.

### Amendment Process

This constitution governs all development practices for this Cal.com fork. Amendments require:

1. **Proposal**: Document the proposed change with rationale
2. **Review**: Evaluation period for impact assessment (minimum 1 day for PATCH, 3 days for MINOR, 7 days for MAJOR changes)
3. **Approval**: Fork maintainer approval
4. **Migration Plan**: For changes affecting existing code, provide migration strategy
5. **Update**: Increment constitution version per semantic versioning rules (see below)

### Versioning Policy

Constitution versions follow semantic versioning:

- **MAJOR**: Backward-incompatible governance changes or principle removals/redefinitions
- **MINOR**: New principles added or existing principles materially expanded
- **PATCH**: Clarifications, wording improvements, typo fixes, non-semantic refinements

### Compliance & Enforcement

- All PRs MUST be checked against this constitution before approval
- Complexity that violates principles MUST be justified explicitly in code comments and PR descriptions
- Repeated non-compliance may result in PR rejections until principles are met
- Use `.specify/templates/checklist-template.md` for systematic compliance verification

### Living Document

- This constitution is reviewed as needed by fork maintainers
- Changes are tracked in the Sync Impact Report at the top of this file
- Adherence metrics (e.g., PR rejection rate for complexity, file count trends) will inform future amendments

**Version**: 1.1.0 | **Ratified**: 2025-11-18 | **Last Amended**: 2025-11-18
