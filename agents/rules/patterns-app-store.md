---
title: App Store Integration Patterns
impact: MEDIUM
tags: app-store, generated-files, factories
---

## App Store Integration Patterns

**Impact: MEDIUM**

The Cal.com repository uses generated files (`*.generated.ts`) for app-store integrations. These files are created by the app-store-cli tool.

**Never modify generated files directly:**

Files like `calendar.services.generated.ts`, `crm.services.generated.ts`, and `apps.browser-*.generated.tsx` are auto-generated. To make structural changes, update the CLI code that generates these files.

**Import patterns for generated files:**

1. **Regular service files** - Need default imports
2. **Browser component files** - May require dynamic imports with Next.js

The `lazyImport` parameter in `getExportedObject()` determines whether to use dynamic imports (for browser components) or static imports (for server-side services).

**Static vs Dynamic imports:**

Recent changes moved from dynamic imports to static map-based imports for better performance. When working with browser components in the app-store, use static imports rather than dynamic imports (using Next.js' `dynamic` function) to maintain consistency.

**Factory function naming:**

When creating factory functions that replace class exports, use the naming convention `Build[ServiceName]` instead of just `[ServiceName]`:

```typescript
// Good - Clear that this is a factory function
export function BuildPaymentService(config: Config) {
  return new PaymentServiceImpl(config);
}

// Bad - Ambiguous whether it's a class or factory
export function PaymentService(config: Config) {
  return new PaymentServiceImpl(config);
}
```

**Cal.com event identification:**

Cal.com events in Google Calendar can be identified by checking if the `iCalUID` ends with `@Cal.com` (e.g., `2GBXSdEixretciJfKVmYN8@Cal.com`). This identifier distinguishes Cal.com bookings from other calendar events.
