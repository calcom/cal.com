---
title: Key File Locations
impact: LOW
impactDescription: Quick reference for finding important files
tags: reference, navigation, file-locations
---

# Key File Locations

## UI Components

- Event types page: `apps/web/modules/event-types/views/event-types-listing-view.tsx`
- Bookings page: `apps/web/modules/bookings/views/bookings-view.tsx`
- Shared UI patterns (tabs, search bars, filter buttons) should maintain consistent alignment across views

## Database

- Schema: `packages/prisma/schema.prisma`
- Migrations: `packages/prisma/migrations/`

## API

- tRPC routers: `packages/trpc/server/routers/`
- API v2 controllers: `apps/api/v2/src/modules/*/controllers/*.controller.ts`
- OpenAPI spec: `docs/api-reference/v2/openapi.json` (auto-generated, don't edit manually)

## Features

- Workflow constants: `packages/features/ee/workflows/lib/constants.ts`
- Round-robin/host prioritization: `packages/features/bookings/lib/getLuckyUser.ts`
- Calendar cache: `packages/features/calendar-cache-sql`
- DataTable guide: `packages/features/data-table/GUIDE.md`

## Translations

- English: `packages/i18n/locales/en/common.json`

## App Store

- Generated files: `packages/app-store/*.generated.ts`
- CLI tool: `packages/app-store-cli/`

## File Naming Conventions

All new files must use **kebab-case**. See [quality-kebab-case-filenames](quality-kebab-case-filenames.md) for details.

- **Repository files**: `prisma-booking-repository.ts` (kebab-case, class keeps `PrismaBookingRepository` PascalCase)
- **Service files**: `membership-service.ts` (kebab-case, class keeps `MembershipService` PascalCase)
- **Components**: `booking-form.tsx` (kebab-case)
- **Utilities**: `date-utils.ts` (kebab-case)
- **Types**: `booking.types.ts` (kebab-case with `.types.ts` suffix)
- **Tests**: Same as source file + `.test.ts` or `.spec.ts`
