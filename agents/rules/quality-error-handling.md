---
title: Error Handling Patterns
impact: HIGH
tags: errors, trpc, services
---

## Error Handling Patterns

**Impact: HIGH**

Use the correct error class based on where the code lives. The tRPC middleware automatically converts `ErrorWithCode` to `TRPCError`.

**ErrorWithCode - for non-tRPC files:**

Use in services, repositories, and utility files.

```typescript
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

// Option 1: Using constructor with ErrorCode enum
throw new ErrorWithCode(ErrorCode.BookingNotFound, "Booking not found");

// Option 2: Using Factory pattern for common HTTP errors
throw ErrorWithCode.Factory.Forbidden("You don't have permission");
throw ErrorWithCode.Factory.NotFound("Resource not found");
throw ErrorWithCode.Factory.BadRequest("Invalid input");
```

**TRPCError - only in tRPC routers:**

```typescript
import { TRPCError } from "@trpc/server";

throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Invalid booking time slot",
});
```

**Incorrect:**

```typescript
// Bad - Using TRPCError in a service file
// packages/features/booking/service/BookingService.ts
import { TRPCError } from "@trpc/server";
throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
```

**Correct:**

```typescript
// Good - Using ErrorWithCode in a service file
// packages/features/booking/service/BookingService.ts
import { ErrorWithCode } from "@calcom/lib/errors";
throw ErrorWithCode.Factory.NotFound("Booking not found");
```

**packages/features Import Restriction:**

Files in `packages/features/**` should NOT import from `@calcom/trpc`. This keeps the features package decoupled from the tRPC layer.
