# Coding Standards & Best Practices

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

## Import Guidelines

### Type Imports

```typescript
// ✅ Good - Use type imports for TypeScript types
import type { User } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

// ❌ Bad - Regular import for types
import { User } from "@prisma/client";
```

### Barrel Imports

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

## Code Structure

### Early Returns

- Prefer early returns to reduce nesting: `if (!booking) return null;`

### Composition Over Prop Drilling

- Use React children and context instead of passing props through multiple components

## Database & Prisma

### Select vs Include

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

### Security Rules

```typescript
// ❌ NEVER expose credential keys
const user = await prisma.user.findFirst({
  select: {
    credentials: {
      select: {
        key: true, // ❌ NEVER do this
      }
    }
  }
});

// ✅ Good - Never select credential.key field
const user = await prisma.user.findFirst({
  select: {
    credentials: {
      select: {
        id: true,
        type: true,
        // key field is excluded for security
      }
    }
  }
});
```

### Performance Guidelines

- Aim for O(n) or O(n log n) complexity, avoid O(n²)
- Use database-level filtering instead of JavaScript filtering
- Consider pagination for large datasets
- Use database transactions for related operations

## Frontend Guidelines

### Internationalization

```typescript
// ✅ Good - Always use t() for user-facing text
const message = t("booking_confirmed");

// ❌ Bad - Never hardcode user-facing strings
const message = "Booking confirmed";
```

### Day.js Performance

```typescript
// ⚠️ Slow in performance-critical code (loops)
dates.map((date) => dayjs(date).add(1, "day").format());

// ✅ Better - Use .utc() for performance
dates.map((date) => dayjs.utc(date).add(1, "day").format());

// ✅ Best - Use native Date when possible
dates.map((date) => new Date(date.valueOf() + 24 * 60 * 60 * 1000));
```

## Error Handling

### Descriptive Errors

```typescript
// ✅ Good - Descriptive error with context
throw new Error(`Unable to create booking: User ${userId} has no available time slots for ${date}`);

// ❌ Bad - Generic error
throw new Error("Booking failed");
```

### Error Types

```typescript
// ✅ Good - Use proper error classes
import { TRPCError } from "@trpc/server";

throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Invalid booking time slot",
});
```

## Security Best Practices

- **Never commit secrets** - Use environment variables
- **Validate all inputs** - Use Zod schemas for validation
- **Authentication checks** - Verify user permissions
- **Sanitize outputs** - Prevent XSS attacks
- **Rate limiting** - Implement for public endpoints
- **HTTPS only** - Never send credentials over HTTP

## Pull Request Guidelines

### Size Limits

- **Large PRs** (>500 lines or >10 files) should be split
- Split by: feature boundaries, layers (DB/API/UI), dependencies
- Pattern: Database migrations → Backend logic → Frontend → Tests

### Commit Messages

- Use conventional commits: `feat:`, `fix:`, `refactor:`
- Be specific: `fix: handle timezone edge case in booking creation`
- Not generic: `fix: booking bug`
