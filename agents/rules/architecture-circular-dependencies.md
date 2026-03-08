---
title: Prevent Circular Dependencies Between Packages
impact: CRITICAL
impactDescription: Prevents build failures, type errors, ensures honest implementation, and maintains clean dependency graph
tags: architecture, dependencies, packages, imports, circular
---

## Prevent Circular Dependencies Between Packages

**Impact: CRITICAL**

Circular dependencies between packages cause build failures, type errors, and make the codebase unmaintainable. The dependency graph must be acyclic, with clear layers from low-level utilities up to high-level features.

The dependency hierarchy (from lowest to highest):
```
packages/lib (lowest - no feature dependencies)
  ↓
packages/app-store
  ↓
packages/features
  ↓
packages/trpc
  ↓
apps/web (highest - can depend on all packages)
```

**Benefits:**
- **Honest implementation**: The dependency graph accurately reflects what code depends on what, with no hidden or circular relationships that create false expectations
- **Predictable behavior**: Code behaves as the dependency structure suggests - no surprises from circular imports
- **Clear mental model**: Developers can reason about the system without tracking complex circular relationships
- **Build reliability**: No circular dependency errors during compilation or bundling
- **Easier testing**: Lower-level packages can be tested independently without pulling in the entire codebase

### `packages/lib`

**Rules:**
1. No files in `packages/lib` import from `@calcom/app-store` or `../app-store/**`
2. No files in `packages/lib` import from `@calcom/features` or `../features/**`
3. No files in `packages/lib` import from `@calcom/trpc` or `../trpc/**`
4. No files in `packages/lib` import from `@trpc/server`
5. **BONUS:** No repository files allowed in `packages/lib` (repositories belong in features or app-store)

**Incorrect:**

```typescript
// Bad - lib importing from features
import { getBooking } from "@calcom/features/bookings";
import { EventRepository } from "@calcom/features/events/repositories";

// Bad - lib importing from app-store
import { googleCalendarHandler } from "@calcom/app-store/googlecalendar";

// Bad - lib importing from trpc
import { router } from "@calcom/trpc/server/trpc";
```

**Correct:**

```typescript
// Good - lib only imports from other lib files or external packages
import { logger } from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { User } from "@prisma/client";
```

### `packages/app-store`

**Rules:**
6. No files in `packages/app-store` import from `@calcom/features` or `../features/**`
7. No files in `packages/app-store` import from `@calcom/trpc` or `../trpc/**`

**Incorrect:**

```typescript
// Bad - app-store importing from features
import { BookingService } from "@calcom/features/bookings/services";

// Bad - app-store importing from trpc
import { publicProcedure } from "@calcom/trpc/server/trpc";
```

**Correct:**

```typescript
// Good - app-store imports from lib and prisma
import { logger } from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { Credential } from "@prisma/client";
```

### `packages/features`

**Rules:**
8. No files in `packages/features` import from `@calcom/trpc` or `../trpc/**`
9. No files in `packages/features` import from `@calcom/web` or `@calcom/web/**`
10. No files in `packages/features` import from `../../apps/web/**`

**Incorrect:**

```typescript
// Bad - features importing from trpc
import { router } from "@calcom/trpc/server/trpc";

// Bad - features importing from web app
import { getServerSession } from "@calcom/web/lib/auth";
import { WebComponent } from "../../apps/web/components/WebComponent";
```

**Correct:**

```typescript
// Good - features import from lib, app-store, and prisma
import { logger } from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { googleCalendarHandler } from "@calcom/app-store/googlecalendar";
```

### `packages/trpc`

**Rules:**
11. No files in `packages/trpc` import from `../apps/web/**`

**Incorrect:**

```typescript
// Bad - trpc importing from web app
import { getServerSession } from "../../apps/web/lib/auth";
```

**Correct:**

```typescript
// Good - trpc imports from features, lib, and prisma
import { BookingService } from "@calcom/features/bookings/services";
import { logger } from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
```

### `packages/testing`

**Rules:**
12. No files in `packages/testing` import from `@calcom/web` or `@calcom/web/**`
13. No files in `packages/testing` import from `@calcom/features` or `@calcom/features/**`
14. No files in `packages/testing` import from `../../apps/web/**`
15. No files in `packages/testing` import from `../features/**`

**Incorrect:**

```typescript
// Bad - testing importing from web or features
import { WebComponent } from "@calcom/web/components";
import { BookingService } from "@calcom/features/bookings";
```

**Correct:**

```typescript
// Good - testing imports from lib and prisma
import { prisma } from "@calcom/prisma";
import { logger } from "@calcom/lib/logger";
```

### `packages/platform/atoms`

**Rules:**
16. No files in `packages/platform/atoms` import from `@calcom/trpc` or `@calcom/trpc/**`
17. No files in `packages/platform/atoms` import from `../../trpc` or `../../trpc/**`
18. No files in `packages/platform/atoms` import from `@calcom/web`

**Incorrect:**

```typescript
// Bad - platform/atoms importing from trpc or web
import { router } from "@calcom/trpc/server/trpc";
import { trpc } from "../../trpc";
import { WebComponent } from "@calcom/web";
```

**Correct:**

```typescript
// Good - platform/atoms imports from lib, features, and ui
import { logger } from "@calcom/lib/logger";
import { Button } from "@calcom/ui/components/button";
import type { Booking } from "@calcom/features/bookings/types";
```

## Enforcement

These rules should be enforced through:
- ESLint rules that detect forbidden import paths
- CI checks that fail on circular dependencies
- Code review guidelines that flag violations