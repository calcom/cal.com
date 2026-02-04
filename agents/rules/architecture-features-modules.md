---
title: packages/features vs apps/web/modules
impact: HIGH
impactDescription: Wrong placement causes tight coupling and import issues
tags: architecture, features, modules, trpc
---

# packages/features vs apps/web/modules

## packages/features

The `packages/features` package should contain only framework-agnostic code:
- Repositories (data access layer)
- Services (business logic)
- Core utilities and helpers
- Types and interfaces

**Files in `packages/features/**` should NOT import from `@calcom/trpc`.**

## apps/web/modules

Web-specific code, particularly anything that uses tRPC, should live in `apps/web/modules/...`:
- React hooks that use tRPC queries/mutations
- tRPC-specific utilities
- Web-only UI components that depend on tRPC

## Example Structure

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

## Why This Matters

```typescript
// ❌ Bad - tRPC hook in packages/features
// packages/features/feature-opt-in/hooks/useFeatureOptIn.ts
import { trpc } from "@calcom/trpc/react";

// ✅ Good - tRPC hook in apps/web/modules
// apps/web/modules/feature-opt-in/hooks/useFeatureOptIn.ts
import { trpc } from "@calcom/trpc/react";
```

This separation ensures that `packages/features` remains portable and can be used by other apps (like `apps/api/v2`) without pulling in web-specific dependencies.
