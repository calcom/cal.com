# Fixing Account Locking Issues (Issue #20322)

## Problem Description

Users may experience account locking due to rate limiting violations, which can cause:
- 404 errors on booking pages
- Login failures with "incorrect details" error
- Password reset emails not being sent
- Internal server errors during account creation

## Root Cause

The issue occurs when users exceed rate limits, triggering automatic account locking via the `autoLock.ts` system. This prevents:
1. User authentication
2. Booking modal access
3. Password reset functionality

## Solution Components

### 1. Account Unlocking Function

We've added an `unlockUser` function in `packages/lib/autoLock.ts`:

```typescript
export async function unlockUser(identifierType: string, identifier: string) {
  // Unlocks user account by userId, email, or apiKey
}
```

### 2. Admin API Endpoint

New TRPC endpoint for admins to unlock users:

```typescript
// packages/trpc/server/routers/viewer/admin/unlockUserAccount.handler.ts
unlockUserAccount: authedAdminProcedure.input(unlockUserAccountSchema).mutation(async (opts) => {
  // Unlocks user account
})
```

### 3. Improved Rate Limiting

Enhanced rate limiting logic in `packages/lib/checkRateLimitAndThrowError.ts`:

```typescript
// Check if user is locked first
if (identifier.includes("@")) {
  const user = await prisma.user.findUnique({
    where: { email: identifier },
    select: { locked: true },
  });
  
  if (user?.locked) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Account is locked due to rate limit violations. Please contact support.",
    });
  }
}
```

### 4. Better Error Handling

Improved booking page error handling in `apps/web/app/(booking-page-wrapper)/[user]/page.tsx`:

```typescript
// Check if user exists and is not locked
if (!props.profile || props.profile.locked) {
  notFound();
}
```

## How to Fix the Issue

### For Developers

1. **Run the test script:**
   ```bash
   yarn tsx scripts/test-issue-20322.ts
   ```

2. **Unlock user via admin panel:**
   - Navigate to Admin → Users
   - Find the locked user
   - Click "Unlock User" button

3. **Check rate limiting settings:**
   - Review `packages/lib/rateLimit.ts`
   - Adjust thresholds if needed

### For Users

1. **Contact support** if account is locked
2. **Wait for rate limit reset** (usually 1 hour)
3. **Use secondary account** for urgent bookings

## Prevention

1. **Monitor rate limits** in production
2. **Set appropriate thresholds** for different user types
3. **Implement gradual backoff** for repeated violations
4. **Add user notifications** before locking

## Testing

Use the provided test script to:
- Find locked users
- Unlock specific accounts
- Verify booking data integrity
- Check event type accessibility

## Related Files

- `packages/lib/autoLock.ts` - Locking/unlocking logic
- `packages/lib/checkRateLimitAndThrowError.ts` - Rate limiting
- `apps/web/app/(booking-page-wrapper)/[user]/page.tsx` - Booking page
- `packages/trpc/server/routers/viewer/admin/unlockUserAccount.handler.ts` - Admin API
- `scripts/test-issue-20322.ts` - Test script 