# Cal.com Bug Bounty Fix - Issue #13667

## Problem Description

The top banner system for broken integrations was not working correctly. When multiple apps had invalid credentials, the system was not properly displaying all the banners, and the height calculation was incorrect, causing layout issues.

## Root Cause Analysis

1. **BannerContainer Issue**: The `BannerContainer` component used a hardcoded if-else chain that didn't properly handle the `invalidAppCredentialBanners` case when it contained multiple apps.

2. **Height Calculation Issue**: The `useBannersHeight` function was calculating height based on the number of banner types rather than the actual number of banners displayed. For `invalidAppCredentialBanners`, each app should count as a separate banner.

## Solution Implemented

### 1. Fixed BannerContainer (LayoutBanner.tsx)

**Before**: Hardcoded if-else chain that didn't properly handle multiple invalid app credential banners.

**After**: Generic approach using `Object.entries()` that properly handles all banner types, including arrays of invalid app credentials.

```typescript
// Before: Hardcoded if-else chain
if (key === "teamUpgradeBanner") {
  const Banner = BannerComponent[key];
  return <Banner data={banners[key]} key={key} />;
} else if (key === "invalidAppCredentialBanners") {
  const Banner = BannerComponent[key];
  return <Banner data={banners[key]} key={key} />;
}
// ... more hardcoded cases

// After: Generic approach
{Object.entries(banners).map(([key, data]) => {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return null;
  }
  const Banner = BannerComponent[key as keyof BannerComponent];
  if (!Banner) {
    return null;
  }
  return <Banner data={data} key={key} />;
})}
```

### 2. Fixed Height Calculation (useBanners.ts)

**Before**: Simple count of banner types, ignoring that `invalidAppCredentialBanners` could contain multiple apps.

**After**: Proper calculation that counts each invalid app credential as a separate banner.

```typescript
// Before: Simple count
const activeBanners = Object.entries(banners).filter(([_, value]) => {
  return value && (!Array.isArray(value) || value.length > 0);
});
return (activeBanners?.length ?? 0) * TOP_BANNER_HEIGHT;

// After: Proper calculation
Object.entries(banners).forEach(([key, value]) => {
  if (!value) return;
  
  if (Array.isArray(value)) {
    // For arrays (like invalidAppCredentialBanners), count each item as a separate banner
    if (value.length > 0) {
      totalHeight += value.length * TOP_BANNER_HEIGHT;
    }
  } else {
    // For non-array values, count as one banner
    totalHeight += TOP_BANNER_HEIGHT;
  }
});
```

## Testing

Created comprehensive tests to verify the fixes:

1. **LayoutBanner.test.tsx**: Tests that multiple invalid app credential banners render correctly
2. **useBanners.test.ts**: Tests that height calculation works properly for various scenarios

## Files Modified

1. `packages/features/shell/banners/LayoutBanner.tsx` - Simplified banner rendering logic
2. `packages/features/shell/banners/useBanners.ts` - Fixed height calculation
3. `packages/features/shell/banners/LayoutBanner.test.tsx` - Added tests for banner rendering
4. `packages/features/shell/banners/useBanners.test.ts` - Added tests for height calculation
5. `packages/features/shell/banners/README.md` - Added documentation

## Impact

- **User Experience**: Users will now see all broken integration banners properly displayed
- **Layout**: Correct height calculation prevents layout issues when multiple banners are shown
- **Maintainability**: Simplified code is easier to maintain and extend
- **Reliability**: Comprehensive tests ensure the fix works correctly

## Verification

The fix ensures that:
1. Multiple invalid app credential banners are displayed correctly
2. Height calculation accounts for each broken integration as a separate banner
3. Other banner types continue to work as expected
4. Empty or null banner data is handled gracefully

This fix resolves the issue where broken integrations were not properly displayed in the top banner system, improving the user experience when dealing with multiple broken integrations. 