# Knowledge Base - Product & Domain-Specific Information

## Repo note for calcom/cal.com

The whole thing is a monorepo. You need to be working in the apps/web folder.

Linting and Formatting
- Run lint with report generation: `yarn lint:report`
- Run type checking: `yarn type-check:ci --force`
- Run auto-fix: `yarn lint -- --fix`

Development
- Install dependencies: `yarn`
- Set up environment:
  - Copy `.env.example` to `.env`
  - Generate keys with `openssl rand -base64 32` for both `NEXTAUTH_SECRET` and `CALENDSO_ENCRYPTION_KEY`
  - Configure Postgres database URL in `.env`
  - Set DATABASE_DIRECT_URL to the same value as DATABASE_URL

Database Setup
- Development: `yarn workspace @calcom/prisma db-migrate`
- Production: `yarn workspace @calcom/prisma db-deploy`

When setting up local development database, it'll create a bunch of users for you. The passwords are the same as the username. e.g. 'free:free' and 'pro:pro'

PR Requirements
- PR title must follow Conventional Commits specification
- For most PRs, you only need to run linting and type checking
- E2E tests will only run if PR has "ready-for-e2e" label

Logging
- Control logging verbosity by setting `NEXT_PUBLIC_LOGGER_LEVEL` in .env:
  - 0: silly
  - 1: trace
  - 2: debug
  - 3: info
  - 4: warn
  - 5: error
  - 6: fatal

## When addressing issues in the Cal.com repository

When working on the Cal.com repository, prioritize fixing type issues before addressing failing tests. Running `yarn type-check:ci --force` to identify and fix TypeScript errors should be done first, as these errors are often the root cause of test failures. Only after resolving type issues should you move on to fixing failing tests with `TZ=UTC yarn test`.

## When creating pull requests

Create pull requests in draft mode by default, so that actual human can mark it as ready for review only when it is.

## When developing Playwright tests in the Cal.com repository

Always ensure Playwright tests pass locally before pushing code. The user requires fast local e2e feedback loops instead of relying on CI, which is too slow for development iteration. Never push test code until those tests are passing locally first.

## When fixing failing tests in the Cal.com repository

When fixing failing tests in the Cal.com repository, take an incremental approach by addressing one file at a time rather than attempting to fix all issues simultaneously. This methodical approach makes it easier to identify and resolve specific issues without getting overwhelmed by the complexity of multiple failing tests across different files. Focus on getting each file's tests passing completely before moving on to the next file.

To identify and fix issues in the Cal.com codebase:

1. Run `yarn type-check:ci --force` to identify TypeScript type errors and get fresh results always, bypassing any caching issues
2. Run `yarn test` to identify failing unit tests
3. Address both type errors and failing tests before considering the task complete
4. Type errors often need to be fixed first as they may be causing the test failures

## When implementing mock services in the Cal.com test files

When mocking calendar services in Cal.com test files, implement the Calendar interface rather than adding individual properties from each specific calendar service type (like FeishuCalendarService). Since all calendar services implement the Calendar interface and are stored in a map, the mock service should also implement this interface to ensure type compatibility. This approach is more maintainable than trying to add all properties from each specific calendar service implementation. For complex mocks that cause type compatibility issues with deep mocks, consider using simpler fake implementations that directly implement the required interfaces instead of trying to match all properties of the original service classes. When needed, you can modify other mock files to support your implementation rather than trying to force compatibility with existing mocks.

## When implementing mocks for Cal.com app-store integrations

When mocking app-store resources in Cal.com tests, prefer implementing simpler mock designs that directly implement the required interfaces rather than trying to match complex deep mock structures created with mockDeep. This approach is more maintainable and helps resolve type compatibility issues. The user encourages creative solutions and refactoring to better designs when the standard mocking approach causes persistent type errors.

## When implementing workflow triggers in the Cal.com repository

To trigger workflows in Cal.com, use the `scheduleWorkflowReminders` function. This is the standard approach used throughout the codebase for triggering any workflow. Before implementing new workflow triggers, examine existing implementations in the codebase to understand the pattern. The function filters workflows by trigger type and processes each workflow step. Key locations where this is used include booking handlers, confirmation processes, and other booking-related events.

## When making changes to Prisma schema in Cal.com

After making changes to the Prisma schema in Cal.com and creating migrations, you need to run `yarn prisma generate` to update the TypeScript types. This is especially important when switching Node.js versions, after adding new fields to models, or after pulling changes that include Prisma schema updates, as it ensures the TypeScript compiler recognizes the updated schema structure. If you encounter errors related to missing enum values (like CreationSource.WEBAPP), running `yarn prisma generate` will typically resolve these issues by regenerating the TypeScript types from the schema.

If you encounter enum generator errors during the Prisma generate step (like "Cannot find module './enum-generator.ts'"), run `yarn install` first before trying to generate. This ensures all dependencies are properly installed before the generation process.

Whenever you change the schema.prisma file, remember to always consolidate migrations by squashing them as declared in the Prisma docs: https://www.prisma.io/docs/orm/prisma-migrate/workflows/squashing-migrations. This helps maintain a clean migration history and prevents accumulation of multiple migration files.

## When reviewing PRs in the Cal.com repository

When asked to review a PR, focus on providing a clear summary of what the PR is doing and its core functionality. Avoid getting sidetracked by CI failures, testing issues, or technical implementation details unless specifically requested. The user prefers concise, focused reviews that prioritize understanding the main purpose and changes of the PR.

## When running Playwright tests in the Cal.com repository

Use the command format `PLAYWRIGHT_HEADLESS=1 yarn e2e [test-file.e2e.ts]` to run Playwright tests instead of the standard `yarn playwright test` command. This format includes the proper timezone setting, virtual display server, and uses the repository's e2e runner.

## When running tests in the Cal.com repository

When running tests in the Cal.com repository, use the TZ=UTC environment variable (e.g., `TZ=UTC yarn test`) to ensure consistent timezone handling. This prevents timezone-related test failures that might occur when tests are run in different environments or by different developers with varying local timezone settings.

## When working on calendar cache features in the Cal.com codebase

The calendar cache system follows specific patterns in `packages/features/calendar-cache-sql`. When implementing provider-specific calendar cache services (like for Outlook/Office365), the provider-specific code should be placed in the corresponding provider directory (e.g., `packages/app-store/office365calendar`).

## When working on PRs in the Cal.com repository

When making changes to the Cal.com codebase, always run type checks locally using `yarn type-check:ci` before concluding that CI failures are unrelated to your changes. Even if errors appear in files you haven't directly modified, your changes might still be causing type issues through dependencies or type inference. Compare type check results between the main branch and your feature branch to confirm whether you've introduced new type errors.

## When working on type issues in the Cal.com repository

Type casting with "as any" is strictly forbidden in the Cal.com codebase. When encountering Prisma type incompatibilities or other TypeScript type issues, proper type-safe solutions must be used instead, such as Prisma extensions system, type parameter constraints, repository pattern isolation, explicit type definitions, and extension composition patterns that are already established in the codebase.

## When working on UI layout changes in the Cal.com web application

The event types page UI components are located in `apps/web/modules/event-types/views/event-types-listing-view.tsx`. This file contains the layout implementation for the search bar and team tabs components on the event types listing page.

Changes to shared UI patterns (like tab layouts and button alignments) need to be checked across multiple views to maintain consistency:
- Event types page layout: `apps/web/modules/event-types/views/event-types-listing-view.tsx`
- Bookings page layout: `apps/web/modules/bookings/views/bookings-view.tsx`
- Common elements like tabs, search bars, and filter buttons should maintain consistent alignment across views

## When working on workflow triggers or similar enum-based features in the Cal.com codebase

To add new workflow triggers:

1. Check packages/prisma/schema.prisma for existing webhooks and workflow trigger enums as reference
2. Add the same enums to workflows (only when asked by user specifically, or else focus on users requirement)
3. Add enums to packages/features/ee/workflows/lib/constants.ts for UI display
4. Add translations to en/locale.json using the format {enum}_trigger (all lowercase). Webhook triggers serve as the reference implementation pattern for workflow triggers.

## When working with app-store integrations in Cal.com

The Cal.com repository uses generated files (*.generated.ts) for app-store integrations. These files are created by the app-store-cli tool. When making structural changes to how integrations are imported or used, you need to update CLI code that generates these files. Typically manual changes to the *.generated.ts files are not made. That was only for PR 19771 for a proof-of-concept. Recent changes have moved from dynamic imports to static map-based imports for better performance. When working with browser components in the app-store, static imports should be used rather than dynamic imports (using Next.js' dynamic function) to maintain consistency with the performance improvements.

When modifying the app-store-cli build.ts file, you must ensure it correctly handles all types of generated files:
1. Regular service files (calendar.services.generated.ts, crm.services.generated.ts, etc.) need default imports
2. Browser component files (apps.browser-addon.generated.tsx, etc.) may require dynamic imports with Next.js
3. After making changes to build.ts, always verify all generated files have the correct imports by checking each file type

The lazyImport parameter in getExportedObject() determines whether to use dynamic imports (for browser components) or static imports (for server-side services).

## When working with branches in the Cal.com repository

When asked to move changes to a different branch in the Cal.com repository, use git commands to commit existing changes to the specified branch rather than redoing the work. This is more efficient and prevents duplication of effort. The user prefers direct branch operations over reimplementing the same changes multiple times.

## When working with calendar events in the Cal.com codebase

Cal.com events in Google Calendar can be identified by checking if the iCalUID ends with "@Cal.com" (e.g., "2GBXSdEixretciJfKVmYN8@Cal.com"). This identifier is used to distinguish Cal.com bookings from other calendar events for data storage and privacy purposes.

## When working with CI/CD in the Cal.com repository

When reviewing CI check failures in Cal.com:
1. E2E tests can be flaky and may fail intermittently
2. Focus only on CI failures that are directly related to your code changes
3. Infrastructure-related failures (like dependency installation issues) can be disregarded if all code-specific checks (type checking, linting, unit tests) are passing

## When working with database models in Cal.com

Database models in Cal.com are defined in `packages/prisma/schema.prisma`. When adding new fields to models:

1. For timestamp fields like `createdAt` and `updatedAt`:
   - Do not set default values if you want existing records to have null values
   - Only new records should get timestamps automatically
   - For `updatedAt` fields, ensure they're updated when records are modified

2. Create a migration using `npx prisma migrate dev --name migration_name` to update the database schema

3. When implementing cache-related features that require timestamp tracking, always update the database schema first before modifying application code that references those fields. The schema changes must be completed and migrated before the application can successfully query or use the new fields.

## When working with generated files in the Cal.com repository

When fixing imports in Cal.com's generated files (like packages/app-store/apps.browser-*.generated.tsx), always check the actual exports in the source files first. For EventTypeAppCardInterface components, they likely use named exports rather than default exports, requiring imports like `import * as ComponentName from "./path"` instead of `import ComponentName from "./path"`. This verification step is crucial when working with browser-addon, browser-appsettings, browser-eventtypesettings, and browser-install generated files. For these files, if you're seeing import errors, check whether the components are exported as default exports in their source files and adjust your import statements accordingly.

## When working with git and CI systems

Always push committed changes to the remote repository before waiting for or checking CI status. Waiting for CI checks on unpushed local commits is backwards - the CI runs on the remote repository state, not local commits. The proper sequence is: commit locally, run local checks, push to remote, then monitor CI status.

## When working with imports/exports in the Cal.com codebase

When working with imports in the Cal.com codebase, particularly in app-store integrations, pay attention to whether modules use named exports or default exports. Many services like VideoApiAdapter, CalendarService, and PaymentService are exported as named exports, but the actual export name may differ from the generic service type (e.g., `export class AppleCalendarService` instead of `export class CalendarService`). When importing these services, verify the actual export name in the source file and use the appropriate named import syntax (e.g., `import { AppleCalendarService } from "./applecalendar/lib/CalendarService"` or with renaming `import { AppleCalendarService as ApplecalendarCalendarService } from "./applecalendar/lib/CalendarService"`). Always check the actual export pattern and name in the source file to determine the correct import syntax.

## When working with tRPC components in the Cal.com repository

When making changes that affect tRPC components or after pulling updates that modify tRPC-related files, you need to follow a specific build order:
1. First run `yarn prisma generate` to ensure all database types are up-to-date
2. Then run `cd packages/trpc && yarn build` to rebuild the tRPC package
This sequence ensures that type definitions are properly generated before building the tRPC components that depend on them, preventing type errors during compilation.

## When working with workflows or webhooks in the Cal.com repository

Workflows and webhooks are two completely separate features in Cal.com with different implementations and file structures. The workflow constants file is located at `packages/features/ee/workflows/lib/constants.ts`, not in the webhooks directory. When working on workflow triggers, do not reference or use webhook trigger implementations - they are distinct systems that should not be confused or mixed.

## When adding new feature flags to the Cal.com repository

To seed new feature flags in Cal.com, create a Prisma migration using the command `yarn prisma migrate dev --create-only --name seed_[feature_name]_feature`. The migration file should be placed in `packages/prisma/migrations/` with a timestamp prefix format like `20250724210733_seed_calendar_cache_sql_features/migration.sql`. Follow the pattern from existing feature seeding migrations like `packages/prisma/migrations/20241216000000_add_calendar_cache_serve/migration.sql` for the SQL structure. The migration should INSERT the new features into the `Feature` table with appropriate type (like `OPERATIONAL`) and default `enabled` status for manual team enablement.

## When adding new UI elements or text strings to Cal.com

All UI strings in Cal.com must be properly translated using the i18n system. This includes:
- Labels for new UI elements (like dropdown labels, settings headers)
- Option values that are displayed to users
- Any text that appears in the interface

Even if some related strings are already translated (like "Bookings" and "Insights"), new strings must be explicitly added to the translation system.

## When creating a pull request

### Title

- Use conventional commits: `feat:`, `fix:`, `refactor:`
- Be specific: `fix: handle timezone edge case in booking creation`
- Not generic: `fix: booking bug`

### Size Limits

- **Large PRs** (>500 lines or >10 files) are not recommended.
- Guide the user how to split large PRs into smaller ones.

## When handling errors

### Descriptive Errors

```typescript
// ✅ Good - Descriptive error with context
throw new Error(`Unable to create booking: User ${userId} has no available time slots for ${date}`);

// ❌ Bad - Generic error
throw new Error("Booking failed");
```

### Error Types

Use `ErrorWithCode` for files that are not directly coupled to tRPC. The tRPC package has a middleware called `errorConversionMiddleware` that automatically converts `ErrorWithCode` instances into `TRPCError` instances.

```typescript
// ✅ Good - Use ErrorWithCode in non-tRPC files (services, repositories, utilities)
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

// Option 1: Using constructor with ErrorCode enum
throw new ErrorWithCode(ErrorCode.BookingNotFound, "Booking not found");

// Option 2: Using the Factory pattern for common HTTP errors
throw ErrorWithCode.Factory.Forbidden("You don't have permission to view this");
throw ErrorWithCode.Factory.NotFound("Resource not found");
throw ErrorWithCode.Factory.BadRequest("Invalid input");

// ✅ Good - Use TRPCError only in tRPC routers/procedures
import { TRPCError } from "@trpc/server";

throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Invalid booking time slot",
});

// ❌ Bad - Using TRPCError in non-tRPC files
import { TRPCError } from "@trpc/server";
// Don't use TRPCError in services, repositories, or utility files
```

### packages/features Import Restrictions

Files in `packages/features/**` should NOT import from `trpc`. This keeps the features package decoupled from the tRPC layer, making the code more reusable and testable. Use `ErrorWithCode` for error handling in these files, and let the tRPC middleware handle the conversion.

## Basic Performance Guidelines

- Aim for O(n) or O(n log n) complexity, avoid O(n²)
- Use database-level filtering instead of JavaScript filtering
- Consider pagination for large datasets
- Use database transactions for related operations

## When querying database

Prefer Select over Include:

```typescript
// ✅ Good - Use select for performance and security
const booking = await prisma.booking.findFirst({
  select: {
    id: true,
    title: true,
    user: {
      select: {
        id: true,
        name: true,
        email: true,
      }
    }
  }
});

// ❌ Bad - Include fetches all fields
const booking = await prisma.booking.findFirst({
  include: {
    user: true, // This gets ALL user fields
  }
});
```

## Avoid barrel imports

```typescript
// ❌ Bad - Avoid importing from index.ts barrel files
import { BookingService, UserService } from "./services";

// ✅ Good - Import directly from source files
import { BookingService } from "./services/BookingService";
import { UserService } from "./services/UserService";


// ❌ Bad
import { Button } from "@calcom/ui";

// ✅ Good - Import directly from source files
import { Button } from "@calcom/ui/components/button";
```

## File Naming Conventions

### Repository Files

- **Must** include `Repository` suffix, PascalCase matching class: `PrismaBookingRepository.ts`

### Service Files

- **Must** include `Service` suffix, PascalCase matching class, avoid generic names: `MembershipService.ts`

### General Files

- **Components**: PascalCase (e.g., `BookingForm.tsx`)
- **Utilities**: kebab-case (e.g., `date-utils.ts`)
- **Types**: PascalCase with `.types.ts` suffix (e.g., `Booking.types.ts`)
- **Tests**: Same as source file + `.test.ts` or `.spec.ts`
- **Avoid**: Dot-suffixes like `.service.ts`, `.repository.ts` (except for tests, types, specs)

## Repository + DTO Pattern and Method Conventions

We use a Repository + DTO pattern to isolate Prisma and the database from business logic. Repositories are the only layer that talks to Prisma and database models. All services, tRPC handlers, API controllers, workflows, and UI should depend on DTOs or domain types, not Prisma types.

DTOs (Data Transfer Objects) are simple TypeScript types or interfaces that represent our domain data in an ORM-agnostic way and are returned from repositories.

### Why this pattern?

- **Prevent type leaks**: Prisma type changes stay inside repositories instead of breaking services, handlers, and UI across dozens of files.
- **Enable safe refactors**: Business logic works against stable DTOs, so you can change storage details without touching higher layers.
- **Keep ORM swappable**: If we ever change ORM, only repository implementations change; services and handlers stay the same.

### What not to do: tight Prisma coupling in business logic

Do not import Prisma types in business logic. Prisma types belong only in the data access layer.

```typescript
// ❌ Bad – business logic depends on Prisma
import type { Webhook } from "@calcom/prisma/client";
export function sendPayload(webhook: Webhook) { /* ... */ }

// ✅ Good – business logic depends on DTO + repository
export interface WebhookDTO { id: string; url: string; }
export interface IWebhookRepository { findById(id: string): Promise<WebhookDTO | null>; }
export async function sendPayload(repo: IWebhookRepository, id: string) {
  const webhook = await repo.findById(id);
  // ...
}
```

### DTOs in repositories

Repositories should expose DTOs from their public methods and keep Prisma types internal. Inside the repository, use `Prisma.*GetPayload` and map rows to DTOs. The public methods should only return DTOs, never Prisma models.

```typescript
// DTO – ORM-agnostic type exported from the repository module
export interface BookingDTO {
  id: string;
  userId: number;
  startTime: Date;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
}
```

### Prisma boundaries

- **Allowed**: `packages/prisma`, repository implementations (`packages/features/**/repositories/*Repository.ts`), and low-level data access infrastructure.
- **Not allowed**: `packages/features/**` business logic (non-repository), `packages/trpc/**` handlers, `apps/web/**`, `apps/api/v2/**` services/controllers, and workflow/webhook/service layers.

### Method Naming Rules

**1. Don't include the repository's entity name in method names**

Method names should be concise and avoid redundancy since the repository class name already indicates the entity type.

```typescript
// ✅ Good - Concise method names
class BookingRepository {
  findById(id: string) { ... }
  findByUserId(userId: string) { ... }
  create(data: BookingCreateInput) { ... }
  delete(id: string) { ... }
}

// ❌ Bad - Redundant entity name in methods
class BookingRepository {
  findBookingById(id: string) { ... }
  findBookingByUserId(userId: string) { ... }
  createBooking(data: BookingCreateInput) { ... }
  deleteBooking(id: string) { ... }
}
```

**2. Use `include` or similar keywords for methods that fetch relational data**

When a method retrieves additional related entities, make this explicit in the method name using keywords like `include`, `with`, or `andRelations`.

```typescript
// ✅ Good - Clear indication of included relations
class EventTypeRepository {
  findById(id: string) {
    return prisma.eventType.findUnique({
      where: { id },
    });
  }

  findByIdIncludeHosts(id: string) {
    return prisma.eventType.findUnique({
      where: { id },
      include: {
        hosts: true,
      },
    });
  }

  findByIdIncludeHostsAndSchedule(id: string) {
    return prisma.eventType.findUnique({
      where: { id },
      include: {
        hosts: true,
        schedule: true,
      },
    });
  }
}

// ❌ Bad - Unclear what data is included
class EventTypeRepository {
  findById(id: string) {
    return prisma.eventType.findUnique({
      where: { id },
      include: {
        hosts: true,
        schedule: true,
      },
    });
  }

  findByIdForReporting(id: string) {
    return prisma.eventType.findUnique({
      where: { id },
      include: {
        hosts: true,
      },
    });
  }
}
```

**3. Keep methods generic and reusable - avoid use-case-specific names**

Repository methods should be general-purpose and describe what data they return, not how or where it's used. This promotes code reuse across different features.

```typescript
// ✅ Good - Generic, reusable methods
class BookingRepository {
  findByUserIdIncludeAttendees(userId: string) {
    return prisma.booking.findMany({
      where: { userId },
      include: {
        attendees: true,
      },
    });
  }

  findByDateRangeIncludeEventType(startDate: Date, endDate: Date) {
    return prisma.booking.findMany({
      where: {
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      include: {
        eventType: true,
      },
    });
  }
}

// ❌ Bad - Use-case-specific method names
class BookingRepository {
  findBookingsForReporting(userId: string) {
    return prisma.booking.findMany({
      where: { userId },
      include: {
        attendees: true,
      },
    });
  }

  findBookingsForDashboard(startDate: Date, endDate: Date) {
    return prisma.booking.findMany({
      where: {
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      include: {
        eventType: true,
      },
    });
  }
}
```

**4. No business logic in repositories**

Repositories should only handle data access. Business logic, validations, and complex transformations belong in the Service layer.

```typescript
// ✅ Good - Repository only handles data access
class BookingRepository {
  findByIdIncludeAttendees(id: string) {
    return prisma.booking.findUnique({
      where: { id },
      include: {
        attendees: true,
      },
    });
  }

  updateStatus(id: string, status: BookingStatus) {
    return prisma.booking.update({
      where: { id },
      data: { status },
    });
  }
}

class BookingService {
  async confirmBooking(bookingId: string) {
    const booking = await this.bookingRepository.findByIdIncludeAttendees(bookingId);
    
    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.status !== "PENDING") {
      throw new Error("Only pending bookings can be confirmed");
    }

    // Business logic: send confirmation emails
    await this.emailService.sendConfirmationToAttendees(booking.attendees);
    
    // Update status through repository
    return this.bookingRepository.updateStatus(bookingId, "CONFIRMED");
  }
}

// ❌ Bad - Business logic in repository
class BookingRepository {
  async confirmBooking(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        attendees: true,
      },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.status !== "PENDING") {
      throw new Error("Only pending bookings can be confirmed");
    }

    // ❌ Business logic shouldn't be here
    await sendEmailToAttendees(booking.attendees);

    return prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
    });
  }
}
```

### Summary

- Method names should be concise: `findById` not `findBookingById`
- Use `include`/`with` keywords when fetching relations: `findByIdIncludeHosts`
- Keep methods generic and reusable: `findByUserIdIncludeAttendees` not `findBookingsForReporting`
- No business logic in repositories - that belongs in Services

## When using Day.js

```typescript
// ⚠️ Slow in performance-critical code (loops)
dates.map((date) => dayjs(date).add(1, "day").format());

// ✅ Better - Use .utc() for performance
dates.map((date) => dayjs.utc(date).add(1, "day").format());

// ✅ Best - Use native Date when possible
dates.map((date) => new Date(date.valueOf() + 24 * 60 * 60 * 1000));
```

## Next.js App Directory: Authorisation Checks in Pages

This can include checking session.user exists or session.org etc.

### TL;DR:

Don’t put permission checks in layout.tsx! Always put them directly inside your page.tsx or relevant server components for every restricted route.


### Why Not to Use Layouts for Permission Checks

* Layouts don’t intercept all requests: If a user navigates directly or refreshes a protected route, layout checks might be skipped, exposing sensitive content.
* APIs and server actions bypass layouts: Sensitive operations running on the server can’t be guarded by checks in the layout.
* Risk of data leaks: Only page/server-level checks ensure that unauthorized users never get protected data.

### ✅ How To Secure Routes (The Right Way)

* Check permissions inside page.tsx or the actual server component.
* Perform all session/user/role validation before querying or rendering sensitive content.
* Redirect or return nothing to unauthorized users, before running restricted code.

### 🛠️ Example: Page-Level Permission Check


```tsx
// app/admin/page.tsx

import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/auth";

export default async function AdminPage() {
  const session = await getUserSession();

  if (!session || session.user.role !== "admin") {
    redirect("/"); // Or show an error
  }

  // Protected content here
  return <div>Welcome, Admin!</div>;
}
```

### 🧠 Key Reminders

* Put permission guards in every restricted page.tsx.
* Never assume layouts are secure for guarding data.
* Validate users before any sensitive queries or rendering.


## Avoid using Dayjs if you don’t need to be strictly tz aware.

When doing logic like Dayjs.startOf(".."), you can instead use date-fns' `startOfMonth(dateObj)` / `endOfDay(dateObj)`;
When doing logic that depends on Browser locale, use i18n.language (prefer to deconstruct) like: `const { i18n: { language } } = useLocale();`, in combination with built-in Intl.

Note that with Date, you’re dealing with System time, so it’s not suited to everywhere (such as in the Booker, where instead we’ll likely migrate to Temporal) - but in most cases the above are suitable.

The main reason for doing so is that Dayjs uses a useful, but highly risky plugin system, which has led us to create `@calcom/dayjs` - this is heavy however, because it pre-loads ALL plugins, including locale handling. It’s a non-ideal solution to a problem that unfortunately exists due to Dayjs.
