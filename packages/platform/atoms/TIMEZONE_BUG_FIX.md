# Timezone Bug Fix for Availability Atom

## Problem
When users changed their browser's timezone/location, the Cal.com availability atom was automatically updating the user's timezone in the database to match the browser's timezone, even though the user didn't explicitly change it in the availability settings.

**Additionally**: The default schedule timezone was also being automatically updated when the user's timezone changed, even after creating new schedules.

## Root Cause
1. The `useTimezone` hook in `packages/platform/atoms/hooks/useTimezone.ts` was automatically updating the user's timezone whenever the browser timezone differed from the stored timezone, regardless of whether the user intended to change it.

2. The `updateProfile.handler.ts` and API v2 me controller were automatically updating the default schedule timezone when the user's timezone changed.

## Solution
1. **Fixed the `useTimezone` hook** to only automatically update the timezone when the user has **NEVER** set any timezone preference.

2. **Fixed the profile update handlers** to only automatically update the default schedule timezone when the user has never set a timezone preference.

## Code Changes

### 1. useTimezone Hook Fix
**Before (buggy)**:
```typescript
if (!isLoading && preferredTimezone && onTimeZoneChange && preferredTimezone !== currentTimezone) {
  onTimeZoneChange(currentTimezone); // Always updates!
}
```

**After (fixed)**:
```typescript
if (
  !isLoading && 
  onTimeZoneChange && 
  preferredTimezone !== currentTimezone &&
  !me?.data?.timeZone // Only update if user has NEVER set any timezone preference
) {
  onTimeZoneChange(currentTimezone);
}
```

### 2. Profile Update Handler Fix
**Before (buggy)**:
```typescript
if (user.timeZone !== data.timeZone && updatedUser.schedules.length > 0) {
  // on timezone change update timezone of default schedule
  await prisma.schedule.updateMany({
    where: { id: defaultScheduleId },
    data: { timeZone: data.timeZone },
  });
}
```

**After (fixed)**:
```typescript
if (user.timeZone !== data.timeZone && updatedUser.schedules.length > 0) {
  // Only automatically update default schedule timezone if user has never set a timezone preference
  const defaultSchedule = await prisma.schedule.findFirst({
    where: { id: user.defaultScheduleId || undefined },
    select: { id: true, timeZone: true },
  });

  // Only update if the default schedule doesn't have an explicitly set timezone
  if (defaultSchedule && (!defaultSchedule.timeZone || defaultSchedule.timeZone === user.timeZone)) {
    await prisma.schedule.updateMany({
      where: { id: defaultScheduleId },
      data: { timeZone: data.timeZone },
    });
  }
}
```

## Impact
- **Before**: If user had any timezone set and browser changed, it would automatically update both user timezone and default schedule timezone
- **After**: If user has set any timezone preference, changing browser timezone will NOT automatically update either the user's timezone or the default schedule timezone
- **Still works for new users**: If a user hasn't set a timezone preference yet, it will still automatically set it to their browser timezone

## Testing
Added comprehensive tests in `packages/platform/atoms/hooks/useTimezone.spec.ts` to verify:
- No automatic updates when user has any timezone preference set
- Automatic updates only when user has no timezone preference
- Proper handling of edge cases (loading, no callback, same timezone, etc.)

## Files Modified
1. `packages/platform/atoms/hooks/useTimezone.ts` - Main fix for useTimezone hook
2. `packages/trpc/server/routers/viewer/me/updateProfile.handler.ts` - Fix for profile update handler
3. `apps/api/v2/src/ee/me/me.controller.ts` - Fix for API v2 me controller
4. `packages/platform/atoms/hooks/useTimezone.spec.ts` - Tests
5. `packages/platform/atoms/TIMEZONE_BUG_FIX.md` - This documentation

## Related Issue
This fixes the bug described in GitHub issue #23270 where availability timezone was automatically changing when browser timezone changed, including the default schedule timezone issue.
