---
title: Enforce Feature Boundaries Through Public APIs
impact: CRITICAL
impactDescription: Prevents architectural erosion and maintains loose coupling
tags: architecture, boundaries, imports, coupling
---

## Enforce Feature Boundaries Through Public APIs

**Impact: CRITICAL**

Features communicate through well-defined interfaces. If bookings needs availability data, it imports from `@calcom/features/availability` through exported interfaces, not by reaching into internal implementation details.

**Incorrect (reaching into internals):**

```typescript
// Bad - Importing internal implementation details
import { calculateSlots } from "@calcom/features/availability/services/internal/slotCalculator";
import { AvailabilityCache } from "@calcom/features/availability/lib/cache";
```

**Correct (using public API):**

```typescript
// Good - Import through the feature's public API
import { getAvailability } from "@calcom/features/availability";
import type { AvailabilityResult } from "@calcom/features/availability";
```

**Shared code placement:**
- Domain-agnostic utilities and cross-cutting concerns (auth, logging): `packages/lib`
- Shared UI primitives: `packages/ui`

**Enforcement:**
Domain boundaries are enforced automatically through linting. If `packages/features/bookings` tries to import from `packages/features/availability/services/internal`, the linter will block it. All cross-feature dependencies must go through the feature's public API.

**Benefits:**
- Discoverability: Looking for booking logic? It's all in `packages/features/bookings`
- Easier testing: Test the entire feature as a unit with all pieces in one place
- Clearer dependencies: When you see `import { getAvailability } from '@calcom/features/availability'`, you know exactly which feature you're depending on

Reference: [Cal.com Engineering Blog](https://cal.com/blog/engineering-in-2026-and-beyond)
