---
title: App Store Integration Patterns
impact: MEDIUM
impactDescription: App store integrations require specific patterns for generated files
tags: app-store, integrations, generated-files
---

# App Store Integration Patterns

## Generated Files

The Cal.com repository uses generated files (`*.generated.ts`) for app-store integrations. These files are created by the app-store-cli tool.

**Do not manually modify** `*.generated.ts` files. If you need structural changes to how integrations are imported or used, update the CLI code that generates these files.

## Import Patterns

Recent changes have moved from dynamic imports to static map-based imports for better performance. When working with browser components in the app-store, static imports should be used rather than dynamic imports.

### Generated File Types

When modifying the app-store-cli `build.ts` file, ensure it correctly handles all types:

1. **Regular service files** (`calendar.services.generated.ts`, `crm.services.generated.ts`, etc.) - need default imports
2. **Browser component files** (`apps.browser-addon.generated.tsx`, etc.) - may require dynamic imports with Next.js

The `lazyImport` parameter in `getExportedObject()` determines whether to use dynamic imports (for browser components) or static imports (for server-side services).

## Calendar Cache Features

The calendar cache system follows specific patterns in `packages/features/calendar-cache-sql`. When implementing provider-specific calendar cache services (like for Outlook/Office365), the provider-specific code should be placed in the corresponding provider directory (e.g., `packages/app-store/office365calendar`).
