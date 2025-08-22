# Timezone Bug Fix - Pull Request Description

## 🐛 Bug Description

**Issue**: When users changed their browser's timezone/location, the Cal.com availability atom was automatically updating the user's timezone and default schedule timezone in the database to match the browser's timezone, even though the user didn't explicitly change it in the availability settings.

**GitHub Issue**: #23270

## 🔄 Reproduction Steps

1. **Create a Cal member** with timezone set to `Europe/London`
2. **Change browser timezone** to `Asia/Kolkata` (or any other timezone)
3. **Go to availability atom** and update availability (without changing timezone)
4. **Check API** - the user's timezone has changed to `Asia/Kolkata`

**Expected Behavior**: Timezone should remain `Europe/London` unless user explicitly changes it
**Actual Behavior**: Timezone automatically changes to browser timezone

## 🔍 Root Cause Analysis

The bug was caused by **three main issues**:

### 1. **useTimezone Hook** (`packages/platform/atoms/hooks/useTimezone.ts`)
```typescript
// BEFORE (Problematic)
if (!isLoading && preferredTimezone && onTimeZoneChange && preferredTimezone !== currentTimezone) {
  onTimeZoneChange(currentTimezone); // Always updates when browser timezone differs
}

// AFTER (Fixed)
if (!isLoading && onTimeZoneChange && preferredTimezone !== currentTimezone && !me?.data?.timeZone) {
  onTimeZoneChange(currentTimezone); // Only updates if user has no timezone preference
}
```

### 2. **Profile Update Handler** (`packages/trpc/server/routers/viewer/me/updateProfile.handler.ts`)
```typescript
// BEFORE (Problematic)
if (user.timeZone !== data.timeZone && updatedUser.schedules.length > 0) {
  // Always updates default schedule timezone when user timezone changes
  await prisma.schedule.updateMany({
    where: { id: defaultScheduleId },
    data: { timeZone: data.timeZone },
  });
}

// AFTER (Fixed)
if (user.timeZone !== data.timeZone && updatedUser.schedules.length > 0) {
  // Only updates if default schedule doesn't have explicitly set timezone
  const defaultSchedule = await prisma.schedule.findFirst({
    where: { id: user.defaultScheduleId || undefined },
    select: { id: true, timeZone: true },
  });
  
  if (defaultSchedule && defaultSchedule.timeZone === user.timeZone) {
    // Only update if schedule is using default user timezone
    await prisma.schedule.updateMany({
      where: { id: defaultSchedule.id },
      data: { timeZone: data.timeZone },
    });
  }
}
```

### 3. **API v2 Me Controller** (`apps/api/v2/src/ee/me/me.controller.ts`)
Similar logic was applied to prevent automatic timezone updates in the API.

## ✅ Solution

### **Key Changes Made**:

1. **Modified `useTimezone` hook** to only auto-update timezone when user has **NEVER** set any timezone preference
2. **Fixed profile update handlers** to prevent default schedule timezone auto-update unless schedule uses default user timezone
3. **Added comprehensive tests** to verify the fix works correctly
4. **Added detailed documentation** explaining the fix and testing approach

### **Logic Changes**:
- **Before**: "Update timezone whenever browser timezone differs from stored timezone"
- **After**: "Only update timezone if user has never set any timezone preference"

## 🧪 Testing

### **Test Cases Added**:
- ✅ User with no timezone preference → Auto-update works
- ✅ User with explicit timezone preference → No auto-update
- ✅ Browser timezone change → No effect on user timezone
- ✅ Explicit timezone change → Still works as expected

### **Manual Testing Scenarios**:
1. **New User**: Creates account in Madrid, timezone auto-detected as `Europe/Madrid` ✅
2. **Existing User**: Travels to London, browser timezone changes to `Europe/London`, but availability stays in `Europe/Madrid` ✅
3. **Explicit Change**: User manually changes timezone to `Asia/Kolkata`, works as expected ✅

## 📁 Files Modified

### **Core Fixes**:
- `packages/platform/atoms/hooks/useTimezone.ts` - Main timezone logic fix
- `packages/trpc/server/routers/viewer/me/updateProfile.handler.ts` - Profile update handler fix
- `apps/api/v2/src/ee/me/me.controller.ts` - API v2 controller fix

### **Documentation & Tests**:
- `packages/platform/atoms/hooks/useTimezone.spec.ts` - Comprehensive tests
- `packages/platform/atoms/TIMEZONE_BUG_FIX.md` - Quick fix summary
- `packages/platform/atoms/TIMEZONE_BUG_FIX_DETAILED.md` - Technical documentation

## 🎯 Impact

### **Positive Changes**:
- ✅ Users can travel without affecting their availability settings
- ✅ Browser timezone changes don't impact user preferences
- ✅ Explicit timezone changes continue to work
- ✅ New users still get automatic timezone detection
- ✅ Backward compatible - no breaking changes

### **User Experience**:
- **Before**: "I set my timezone to London, but when I travel to Madrid, my availability changes to Madrid timezone"
- **After**: "I set my timezone to London, and it stays London regardless of where I travel"

## 🔒 Security & Performance

- **No security implications** - only affects timezone logic
- **Performance**: Minimal impact - only adds one database query check
- **Database**: No schema changes required

## 🚀 Deployment

- **Backward compatible**: Existing users unaffected
- **No migration needed**: Works with existing data
- **Can be deployed immediately**: No breaking changes

---

**Fixes**: #23270
**Type**: Bug Fix
**Breaking Change**: No
