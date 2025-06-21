# Banner System

This directory contains the banner system for Cal.com, which displays various types of notifications at the top of the application.

## Components

### LayoutBanner.tsx
- `BannerContainer`: Main component that renders all active banners
- `BannerComponent`: Object mapping banner types to their respective components

### useBanners.ts
- `useBanners`: Hook that fetches banner data and calculates banner height
- `useBannersHeight`: Hook that calculates the total height needed for all active banners

## Banner Types

1. **teamUpgradeBanner**: Shows when a team needs to be upgraded
2. **orgUpgradeBanner**: Shows when an organization needs to be upgraded
3. **verifyEmailBanner**: Shows when email verification is required
4. **adminPasswordBanner**: Shows when admin password needs to be changed
5. **impersonationBanner**: Shows when a user is being impersonated
6. **calendarCredentialBanner**: Shows when calendar credentials are invalid
7. **invalidAppCredentialBanners**: Shows when app credentials are invalid (can be multiple apps)

## Recent Fixes

### Issue #13667 - Top banner for broken integrations

**Problem**: The banner system was not properly handling multiple invalid app credential banners, and the height calculation was incorrect.

**Solution**:

1. **Simplified BannerContainer**: Replaced the hardcoded if-else chain with a generic approach that properly handles all banner types, including arrays of invalid app credentials.

2. **Fixed Height Calculation**: Updated `useBannersHeight` to properly calculate height for multiple invalid app credential banners by counting each app as a separate banner.

**Changes Made**:

- `packages/features/shell/banners/LayoutBanner.tsx`: Simplified banner rendering logic
- `packages/features/shell/banners/useBanners.ts`: Fixed height calculation for multiple banners
- Added comprehensive tests to verify the fixes work correctly

**Testing**:
- Created tests for `BannerContainer` to verify multiple invalid app credential banners render correctly
- Created tests for `useBannersHeight` to verify proper height calculation
- All tests pass and verify the fix works as expected

## Usage

The banner system is automatically used throughout the application. When there are broken integrations or other issues that require user attention, the appropriate banners will be displayed at the top of the page.

For invalid app credentials specifically, each broken integration will show as a separate banner with:
- Warning styling
- App name in the message
- "Reinstall app" action button that navigates to the app's configuration page 