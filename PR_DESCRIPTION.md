## Summary

Fixes a bug where a user's availability timezone was automatically updated when the browser's timezone changed, even if the user hadn't explicitly changed their timezone preference.

## Problem

When users switched their browser/system timezone (e.g., Europe/London → Asia/Kolkata), Cal.com automatically updated the availability atom in the database. This caused user schedules to shift unintentionally, even though the user never changed their availability settings.

**Issue:** #23270

## Root Cause

Automatic timezone update logic was applied too aggressively in multiple places:

- **useTimezone hook** – always updated when browser timezone differed
- **updateProfile.handler.ts** – always updated default schedule timezone  
- **me.controller.ts (API v2)** – repeated the same automatic update logic

## Solution

Timezone is now only auto-detected for new users who have never set a timezone preference.

- **useTimezone** → auto-update only if `!me?.data?.timeZone`
- **updateProfile.handler.ts** → only update when schedule is using the default user timezone
- **me.controller.ts** → aligned logic with new rule to prevent unnecessary updates

## Testing

✅ User with no timezone preference → auto-update works  
✅ User with explicit timezone preference → no auto-update  
✅ Browser timezone change → no effect  
✅ Explicit timezone change by user → works as expected  
✅ New users → still get automatic detection  

## Files Modified

- `packages/platform/atoms/hooks/useTimezone.ts`
- `packages/trpc/server/routers/viewer/me/updateProfile.handler.ts`
- `apps/api/v2/src/ee/me/me.controller.ts`

## Impact

- Users can travel without availability being overwritten
- Browser timezone changes no longer affect user preferences
- Explicit timezone updates remain functional
- New users benefit from automatic detection
- **Backward compatible** - no breaking changes

Fixes #23270

