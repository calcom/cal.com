---
title: Error Handling Patterns
impact: HIGH
impactDescription: Proper error handling ensures debuggable and secure code
tags: errors, trpc, services, repositories
---

# Error Handling Patterns

## Descriptive Errors

```typescript
// ✅ Good - Descriptive error with context
throw new Error(`Unable to create booking: User ${userId} has no available time slots for ${date}`);

// ❌ Bad - Generic error
throw new Error("Booking failed");
```

## ErrorWithCode vs TRPCError

Use `ErrorWithCode` for files that are not directly coupled to tRPC. The tRPC package has a middleware called `errorConversionMiddleware` that automatically converts `ErrorWithCode` instances into `TRPCError` instances.

### In Non-tRPC Files (services, repositories, utilities)

```typescript
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

// Option 1: Using constructor with ErrorCode enum
throw new ErrorWithCode(ErrorCode.BookingNotFound, "Booking not found");

// Option 2: Using the Factory pattern for common HTTP errors
throw ErrorWithCode.Factory.Forbidden("You don't have permission to view this");
throw ErrorWithCode.Factory.NotFound("Resource not found");
throw ErrorWithCode.Factory.BadRequest("Invalid input");
```

### In tRPC Routers Only

```typescript
import { TRPCError } from "@trpc/server";

throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Invalid booking time slot",
});
```

## packages/features Import Restrictions

Files in `packages/features/**` should NOT import from `@calcom/trpc`. This keeps the features package decoupled from the tRPC layer, making the code more reusable and testable. Use `ErrorWithCode` for error handling in these files.
