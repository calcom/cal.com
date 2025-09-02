# Apps Namespace Migration

## Overview
This document outlines the migration from using the `common` namespace to a new `apps` namespace for app-related translations in the Cal.com codebase.

## What Was Accomplished

### 1. Created New Apps Namespace
- Created `apps/web/public/static/locales/en/apps.json` with app-specific translations
- Extracted 100+ app-related translation keys from the common namespace
- Organized translations by functionality (installation, configuration, management, etc.)

### 2. Updated Components to Use Apps Namespace
The following components have been updated to use the `useTranslation("apps")` hook:

#### Web App Components (`apps/web/components/apps/`)
- ✅ `AppPage.tsx` - Main app page component
- ✅ `CalendarListContainer.tsx` - Calendar list container
- ✅ `MultiDisconnectIntegration.tsx` - Multi-disconnect integration
- ✅ `InstallAppButtonChild.tsx` - Install app button child
- ✅ `App.tsx` - App wrapper component

#### App Modules (`apps/web/modules/apps/`)
- ✅ `apps-view.tsx` - Main apps view
- ✅ `categories/categories-view.tsx` - Categories view
- ✅ `categories/[category]/category-view.tsx` - Individual category view
- ✅ `installed/[category]/installed-category-view.tsx` - Installed apps view
- ✅ `installation/[[...step]]/step-view.tsx` - Installation step view

#### Features Components (`packages/features/apps/`)
- ✅ `AdminAppsList.tsx` - Admin apps list
- ✅ `components/DisconnectIntegration.tsx` - Disconnect integration
- ✅ `components/AppCard.tsx` - App card component
- ✅ `components/Categories.tsx` - Categories component
- ✅ `components/RecentAppsSlider.tsx` - Recent apps slider
- ✅ `components/AppList.tsx` - App list component

### 3. Translation Keys Moved to Apps Namespace
Key translation categories include:
- App installation and removal
- App configuration and setup
- App store navigation
- Calendar and integration management
- Payment and conferencing apps
- Error messages and success notifications
- UI labels and descriptions

## Benefits of This Migration

1. **Reduced Bundle Size**: App-related translations are now loaded only when needed
2. **Better Organization**: App translations are logically separated from other common translations
3. **Improved Performance**: Smaller translation files for app pages
4. **Maintainability**: Easier to manage app-specific translations

## Next Steps

### 1. Remove App Translations from Common Namespace
- Remove the migrated translation keys from `apps/web/public/static/locales/en/common.json`
- This will reduce the common.json file size significantly

### 2. Update Other Languages
- Create `apps.json` files for other supported languages
- Migrate app translations from their respective `common.json` files

### 3. Testing
- Verify all app pages load correctly with the new namespace
- Ensure no translation keys are missing
- Test with different locales

### 4. Documentation
- Update developer documentation to reflect the new namespace structure
- Document how to add new app-related translations

## Technical Details

### Hook Usage
Components now use:
```typescript
import { useTranslation } from "react-i18next";

export function MyComponent() {
  const { t } = useTranslation("apps");
  return <div>{t("app_successfully_installed")}</div>;
}
```

### Namespace Structure
The `apps` namespace contains translations organized by:
- Installation and setup
- App management
- Integration features
- Error handling
- UI elements

## Files Modified

### New Files Created
- `apps/web/public/static/locales/en/apps.json`

### Files Updated
- 15+ component files across the codebase
- All app-related components now use the apps namespace

## Notes
- The migration maintains backward compatibility during the transition
- All existing functionality should work as expected
- The common namespace is still used for non-app translations
- This is a significant optimization that will improve app page performance 