# Timezone Bug Fix - Detailed Technical Documentation

## Overview

This document provides a comprehensive technical overview of the timezone auto-update bug fix implemented in the Cal.com availability atom.

## Problem Statement

### Issue Description
When users changed their browser's timezone/location, the Cal.com availability atom was automatically updating:
1. The user's timezone in the database
2. The default schedule timezone
3. Availability settings timezone

This occurred even when users didn't explicitly change their timezone preferences, causing unexpected behavior and loss of user control over their availability settings.

### Bug Reproduction Steps
1. Create a Cal member with timezone set to "Europe/London"
2. Change browser timezone to "Asia/Kolkata"
3. Go to availability atom and update availability (without changing timezone)
4. Check API - user's timezone has changed to "Asia/Kolkata"

### Impact
- Users lost control over their availability timezone settings
- Default schedules were automatically modified without user consent
- Inconsistent behavior between user expectations and system behavior

## Root Cause Analysis

### Primary Issues Identified

#### 1. useTimezone Hook (Platform Atoms)
**File**: `packages/platform/atoms/hooks/useTimezone.ts`

**Problem**: The hook was automatically updating user timezone whenever browser timezone differed from stored timezone, regardless of user intent.

**Original Logic**:
```typescript
if (!isLoading && preferredTimezone && onTimeZoneChange && preferredTimezone !== currentTimezone) {
  onTimeZoneChange(currentTimezone); // Always updates!
}
```

#### 2. Profile Update Handler (Web App)
**File**: `packages/trpc/server/routers/viewer/me/updateProfile.handler.ts`

**Problem**: Automatically updated default schedule timezone when user timezone changed.

**Original Logic**:
```typescript
if (user.timeZone !== data.timeZone && updatedUser.schedules.length > 0) {
  // on timezone change update timezone of default schedule
  await prisma.schedule.updateMany({
    where: { id: defaultScheduleId },
    data: { timeZone: data.timeZone },
  });
}
```

#### 3. API v2 Me Controller
**File**: `apps/api/v2/src/ee/me/me.controller.ts`

**Problem**: Similar automatic update behavior in the API v2 endpoint.

## Solution Design

### Design Principles
1. **User Control**: Users should have full control over their timezone preferences
2. **Backward Compatibility**: New users should still get automatic timezone detection
3. **Explicit Changes**: Only explicit user actions should change timezone settings
4. **Consistency**: Behavior should be consistent across all endpoints

### Solution Strategy
1. **Conditional Auto-Updates**: Only auto-update timezone when user has never set any preference
2. **Preserve Explicit Settings**: Respect any explicitly set timezone preferences
3. **Maintain New User Experience**: Keep automatic detection for new users

## Implementation Details

### 1. useTimezone Hook Fix

**File**: `packages/platform/atoms/hooks/useTimezone.ts`

**Changes**:
```typescript
// BEFORE (buggy)
if (!isLoading && preferredTimezone && onTimeZoneChange && preferredTimezone !== currentTimezone) {
  onTimeZoneChange(currentTimezone);
}

// AFTER (fixed)
if (
  !isLoading && 
  onTimeZoneChange && 
  preferredTimezone !== currentTimezone &&
  !me?.data?.timeZone // Only update if user has NEVER set any timezone preference
) {
  onTimeZoneChange(currentTimezone);
}
```

**Logic**:
- Check if user has explicitly set a timezone preference (`me?.data?.timeZone`)
- Only auto-update if user has never set any preference (null/undefined)
- Preserve any existing timezone preferences

### 2. Profile Update Handler Fix

**File**: `packages/trpc/server/routers/viewer/me/updateProfile.handler.ts`

**Changes**:
```typescript
// BEFORE (buggy)
if (user.timeZone !== data.timeZone && updatedUser.schedules.length > 0) {
  await prisma.schedule.updateMany({
    where: { id: defaultScheduleId },
    data: { timeZone: data.timeZone },
  });
}

// AFTER (fixed)
if (user.timeZone !== data.timeZone && updatedUser.schedules.length > 0) {
  // Check if default schedule has explicitly set timezone
  const defaultSchedule = await prisma.schedule.findFirst({
    where: { id: user.defaultScheduleId || undefined },
    select: { id: true, timeZone: true },
  });

  // Only update if default schedule doesn't have explicitly set timezone
  if (defaultSchedule && (!defaultSchedule.timeZone || defaultSchedule.timeZone === user.timeZone)) {
    await prisma.schedule.updateMany({
      where: { id: defaultScheduleId },
      data: { timeZone: data.timeZone },
    });
  }
}
```

**Logic**:
- Query the default schedule to check if it has an explicitly set timezone
- Only update if the schedule doesn't have an explicit timezone or uses the default user timezone
- Preserve any explicitly set schedule timezones

### 3. API v2 Me Controller Fix

**File**: `apps/api/v2/src/ee/me/me.controller.ts`

**Changes**:
```typescript
// BEFORE (buggy)
if (bodySchedule.timeZone && user.defaultScheduleId) {
  await this.schedulesService.updateUserSchedule(user, user.defaultScheduleId, {
    timeZone: bodySchedule.timeZone,
  });
}

// AFTER (fixed)
if (bodySchedule.timeZone && user.defaultScheduleId) {
  // Check if default schedule has explicitly set timezone
  const defaultSchedule = await this.schedulesService.getSchedule(user.defaultScheduleId);
  
  // Only update if default schedule doesn't have explicitly set timezone
  if (defaultSchedule && (!defaultSchedule.timeZone || defaultSchedule.timeZone === user.timeZone)) {
    await this.schedulesService.updateUserSchedule(user, user.defaultScheduleId, {
      timeZone: bodySchedule.timeZone,
    });
  }
}
```

**Logic**:
- Similar to profile update handler
- Check if default schedule has explicit timezone before updating
- Preserve explicit timezone settings

## Testing Strategy

### Test Cases Implemented

#### 1. useTimezone Hook Tests
**File**: `packages/platform/atoms/hooks/useTimezone.spec.ts`

**Test Scenarios**:
- ✅ Should NOT call onTimeZoneChange when user has any timezone preference set
- ✅ Should call onTimeZoneChange when user has NO timezone preference set
- ✅ Should NOT call onTimeZoneChange when timezones are the same
- ✅ Should NOT call onTimeZoneChange when still loading
- ✅ Should NOT call onTimeZoneChange when no callback provided
- ✅ Should call onTimeZoneChange when user has empty string timezone

#### 2. Integration Test Scenarios
**Manual Testing**:
- ✅ New user gets automatic timezone detection
- ✅ Existing user with timezone preference - no automatic updates
- ✅ Explicit timezone changes still work
- ✅ Default schedule timezone preservation
- ✅ Cross-browser timezone change handling

### Test Data Examples

#### Scenario 1: New User
```json
{
  "user": {
    "timeZone": null
  },
  "browserTimezone": "Asia/Kolkata",
  "expected": "Auto-update to Asia/Kolkata"
}
```

#### Scenario 2: Existing User with Preference
```json
{
  "user": {
    "timeZone": "Europe/London"
  },
  "browserTimezone": "Asia/Kolkata",
  "expected": "Stay Europe/London"
}
```

#### Scenario 3: Default Schedule with Explicit Timezone
```json
{
  "user": {
    "timeZone": "Europe/London",
    "defaultSchedule": {
      "timeZone": "America/New_York"
    }
  },
  "browserTimezone": "Asia/Kolkata",
  "expected": "Schedule stays America/New_York"
}
```

## Performance Considerations

### Database Queries
- Added one additional query to check default schedule timezone
- Query is lightweight (only selects id and timeZone)
- Only executed when timezone changes are attempted

### Memory Impact
- Minimal memory overhead
- No additional state management required
- Existing caching mechanisms remain unchanged

### API Response Times
- Negligible impact on API response times
- Additional logic is conditional and fast

## Security Considerations

### Input Validation
- Existing timezone validation remains in place
- No new security vulnerabilities introduced
- Input sanitization unchanged

### Authorization
- Existing authorization checks preserved
- No changes to user permission logic
- API key validation remains the same

## Backward Compatibility

### Breaking Changes
- ❌ None - all existing functionality preserved
- ✅ New users still get automatic timezone detection
- ✅ Explicit timezone changes still work

### Migration
- No database migrations required
- No configuration changes needed
- Existing user preferences preserved

## Monitoring and Observability

### Logging
- Existing logging mechanisms preserved
- No additional logging required for this fix
- Error handling remains unchanged

### Metrics
- No new metrics required
- Existing timezone-related metrics remain valid
- Performance monitoring unchanged

## Future Considerations

### Potential Enhancements
1. **User Preference Flag**: Add explicit user preference for auto-update behavior
2. **Timezone Change History**: Track timezone change history for audit purposes
3. **Bulk Operations**: Handle timezone changes for multiple schedules efficiently

### Maintenance
- Regular testing of timezone functionality
- Monitor for edge cases in different timezone scenarios
- Consider timezone database updates

## Deployment Notes

### Release Strategy
- Can be deployed as part of regular release cycle
- No special deployment considerations
- Feature flag not required

### Rollback Plan
- Standard rollback procedures apply
- No database changes to revert
- Code changes are additive and safe

## Related Issues and References

### GitHub Issues
- **Issue #23270**: Availability Atom Timezone Bug
- Related timezone issues in the repository

### Documentation
- Cal.com API documentation
- Timezone handling best practices
- User preference management guidelines

## Conclusion

This fix successfully addresses the timezone auto-update bug while maintaining backward compatibility and user experience. The solution is robust, well-tested, and follows established patterns in the codebase.

### Key Achievements
- ✅ User control over timezone preferences restored
- ✅ Automatic updates prevented for existing users
- ✅ New user experience preserved
- ✅ Comprehensive test coverage added
- ✅ No breaking changes introduced

### Success Metrics
- Users can now set timezone preferences without fear of automatic changes
- Default schedules remain stable across browser timezone changes
- Explicit timezone changes continue to work as expected
- New users still benefit from automatic timezone detection
