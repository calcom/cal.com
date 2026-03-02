---
title: Import and Export Patterns
impact: MEDIUM
impactDescription: Incorrect imports cause build failures and bundle bloat
tags: imports, exports, modules, app-store
---

# Import and Export Patterns

## Named vs Default Exports

When working with imports in the Cal.com codebase, particularly in app-store integrations, pay attention to whether modules use named exports or default exports.

Many services like VideoApiAdapter, CalendarService, and PaymentService are exported as named exports, but the actual export name may differ from the generic service type.

```typescript
// ✅ Good - Verify actual export name and use named import
import { AppleCalendarService } from "./applecalendar/lib/CalendarService";

// With renaming if needed
import { AppleCalendarService as ApplecalendarCalendarService } from "./applecalendar/lib/CalendarService";

// ❌ Bad - Assuming default export without checking
import CalendarService from "./applecalendar/lib/CalendarService";
```

## Generated Files

When fixing imports in Cal.com's generated files (like `packages/app-store/apps.browser-*.generated.tsx`), always check the actual exports in the source files first.

For EventTypeAppCardInterface components, they likely use named exports rather than default exports, requiring:

```typescript
import * as ComponentName from "./path";
// instead of
import ComponentName from "./path";
```

## Factory Function Naming

When creating factory functions that replace class exports, use the naming convention `Build[ServiceName]` instead of just `[ServiceName]`:

```typescript
// ✅ Good - Clear factory function naming
export function BuildPaymentService() { ... }

// ❌ Bad - Confusing with class export
export function PaymentService() { ... }
```
