---
title: Key File Locations
impact: LOW
tags: reference, files, navigation
---

## Key File Locations

**Impact: LOW (Reference)**

Quick reference for commonly needed file locations in the Cal.com codebase.

**Core application:**

| Purpose | Location |
|---------|----------|
| Main Next.js app | `apps/web/` |
| App Router routes | `apps/web/app/` |
| Database schema | `packages/prisma/schema.prisma` |
| tRPC routers | `packages/trpc/server/routers/` |
| Shared UI components | `packages/ui/` |
| Feature-specific code | `packages/features/` |
| Third-party integrations | `packages/app-store/` |
| Shared utilities | `packages/lib/` |

**Translations:**

| Purpose | Location |
|---------|----------|
| English translations | `apps/web/public/static/locales/en/common.json` |

**UI layouts:**

| Purpose | Location |
|---------|----------|
| Event types page | `apps/web/modules/event-types/views/event-types-listing-view.tsx` |
| Bookings page | `apps/web/modules/bookings/views/bookings-view.tsx` |

**Workflows:**

| Purpose | Location |
|---------|----------|
| Workflow constants | `packages/features/ee/workflows/lib/constants.ts` |

**Calendar cache:**

| Purpose | Location |
|---------|----------|
| SQL-based cache | `packages/features/calendar-cache-sql/` |
| Provider-specific (Outlook) | `packages/app-store/office365calendar/` |

**API documentation:**

| Purpose | Location |
|---------|----------|
| OpenAPI spec (auto-generated) | `docs/api-reference/v2/openapi.json` |
| API v2 controllers | `apps/api/v2/src/modules/*/controllers/*.controller.ts` |

**DataTable guide:**

Refer to `packages/features/data-table/GUIDE.md` for implementation patterns.
