---
title: packages/features vs apps/web/modules
impact: CRITICAL
tags: architecture, separation, trpc
---

## packages/features vs apps/web/modules

**Impact: CRITICAL**

Maintain strict separation between framework-agnostic code and web-specific code.

**packages/features - Framework-agnostic code:**

- Repositories (data access layer)
- Services (business logic)
- Core utilities and helpers
- Types and interfaces

**apps/web/modules - Web-specific code:**

- React hooks using tRPC queries/mutations
- tRPC-specific utilities
- Web-only UI components depending on tRPC

**Example structure:**

```
packages/features/feature-opt-in/
├── repository/
│   └── FeatureOptInRepository.ts    # Data access - OK here
├── service/
│   └── FeatureOptInService.ts       # Business logic - OK here
└── types.ts                          # Types - OK here

apps/web/modules/feature-opt-in/
└── hooks/
    └── useFeatureOptIn.ts           # tRPC hook - MUST be here
```

**Incorrect:**

```typescript
// Bad - tRPC hook in packages/features
// packages/features/feature-opt-in/hooks/useFeatureOptIn.ts
import { trpc } from "@calcom/trpc/react";
export function useFeatureOptIn() {
  return trpc.viewer.featureOptIn.useQuery();
}
```

**Correct:**

```typescript
// Good - tRPC hook in apps/web/modules
// apps/web/modules/feature-opt-in/hooks/useFeatureOptIn.ts
import { trpc } from "@calcom/trpc/react";
export function useFeatureOptIn() {
  return trpc.viewer.featureOptIn.useQuery();
}
```

**Why this matters:**

This separation ensures `packages/features` remains portable and can be used by other apps (like `apps/api/v2`) without pulling in web-specific dependencies like tRPC React hooks.

**Import restriction:**

Files in `packages/features/**` should NOT import from `@calcom/trpc`.
