---
title: Import Patterns
impact: HIGH
tags: imports, typescript, modules
---

## Import Patterns

**Impact: HIGH**

Follow these import patterns to ensure proper module resolution and maintain clean code.

**Named vs Default Exports:**

When working with app-store integrations, pay attention to export types. Many services use named exports with specific class names.

```typescript
// Check the source file for actual export name
// Source might have: export class AppleCalendarService
// Not: export default class CalendarService

// Correct - match the actual export name
import { AppleCalendarService } from "./applecalendar/lib/CalendarService";

// Or with renaming
import { AppleCalendarService as ApplecalendarCalendarService } from "./applecalendar/lib/CalendarService";
```

**Generated files imports:**

For generated files (`*.generated.tsx`), check if components use named or default exports:

```typescript
// If source uses named export
import * as ComponentName from "./path";

// If source uses default export
import ComponentName from "./path";
```

**API v2 Imports:**

When importing from `@calcom/features` or `@calcom/trpc` into `apps/api/v2`, use platform-libraries:

```typescript
// Step 1: In packages/platform/libraries/index.ts
export { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";

// Step 2: In apps/api/v2
import { ProfileRepository } from "@calcom/platform-libraries";

// Bad - Direct import causes module not found error
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
```

**Type imports:**

Always use `import type` for TypeScript types:

```typescript
// Good
import type { User } from "@prisma/client";

// Bad
import { User } from "@prisma/client";
```
