# Cal.com Development Summary - Mateusz Page

## Navigation Menu Structure

### Main Navigation Location
- **File**: `apps/web/modules/shell/navigation/Navigation.tsx`
- **Function**: `getNavigationItems()` defines the main navigation menu items
- **Platform Navigation**: `platformNavigationItems` for platform-specific pages

### Key Files
- `apps/web/modules/shell/navigation/Navigation.tsx` - Main navigation items
- `apps/web/modules/shell/navigation/NavigationItem.tsx` - Navigation item component and types
- `apps/web/modules/shell/useBottomNavItems.ts` - Bottom navigation items (Settings, etc.)
- `apps/web/modules/shell/SideBar.tsx` - Sidebar container

### Navigation Item Structure
```typescript
type NavigationItemType = {
  name: string;
  href: string;
  icon?: IconName;
  badge?: React.ReactNode;
  child?: NavigationItemType[];
  moreOnMobile?: boolean;
  isCurrent?: ({ item, isChild, pathname }) => boolean;
}
```

## Route Structure

### Route Groups
- `(use-page-wrapper)` - Route group that adds PageWrapper + AppProviders
- `(main-nav)` - Nested route group that adds Shell (SideBar, header, navigation)
- `(booking-page-wrapper)` - For booking pages

### Page Structure Pattern
```
apps/web/app/(use-page-wrapper)/(main-nav)/[route-name]/
  ├── page.tsx          # Server component (auth, data fetching)
  ├── [Name]Wrapper.tsx # Client component (ShellMainAppDir wrapper)
  └── [Name]Content.tsx # Client component (actual content)
```

### Example: Mateusz Page
- **Server Component** (`page.tsx`): Handles authentication, onboarding checks, metadata
- **Wrapper Component** (`MateuszWrapper.tsx`): Uses `ShellMainAppDir` for header/subtitle
- **Content Component** (`MateuszContent.tsx`): Contains all UI elements and logic

## UI Component Imports

### Correct Import Paths
```typescript
// ✅ CORRECT - Import from main form module
import { Input, SelectField, Switch, CheckboxField } from "@calcom/ui/components/form";

// ❌ WRONG - Don't import from subdirectories
import { Input } from "@calcom/ui/components/form/inputs/TextField";
import { CheckboxField } from "@calcom/ui/components/form/checkbox";
```

### Common UI Components
- `Button` - `@calcom/ui/components/button`
- `Badge` - `@calcom/ui/components/badge`
- `FormCard, FormCardBody` - `@calcom/ui/components/card`
- `Alert` - `@calcom/ui/components/alert`
- `Tooltip` - `@calcom/ui/components/tooltip`
- `SkeletonText` - `@calcom/ui/components/skeleton`
- `Icon` - `@calcom/ui/components/icon`

## Icon Names

### Available Icons
Icons are defined in `packages/ui/components/icon/icon-names.ts`

**Important**: "minus" icon does NOT exist. Use alternatives:
- `"chevron-down"` - For decrement buttons
- `"arrow-down"` - Alternative for decrement
- `"plus"` - For increment buttons
- `"chevron-up"` - For increment alternatives

### Common Icons
- `"plus"`, `"chevron-down"`, `"chevron-up"`, `"arrow-down"`, `"arrow-up"`
- `"calendar"`, `"clock"`, `"settings"`, `"user"`, `"users"`
- `"check"`, `"x"`, `"trash-2"`, `"edit-3"`, `"refresh-cw"`
- See full list in `packages/ui/components/icon/icon-names.ts`

## Page Wrapper Components

### ShellMainAppDir
```typescript
<ShellMainAppDir
  heading="Page Title"
  subtitle="Page description"
  CTA={<Button>Action</Button>}
>
  {children}
</ShellMainAppDir>
```

### PageWrapper (via layout.tsx)
- Automatically wraps pages in `(use-page-wrapper)` route group
- Provides: Theme, Tooltips, Feature Flags, Analytics, etc.
- Located in: `apps/web/app/(use-page-wrapper)/layout.tsx`

## Form Components Usage

### CheckboxField
```typescript
// ✅ CORRECT - Uses native HTML input onChange
<CheckboxField
  description="Label text"
  checked={checked}
  onChange={(event) => {
    setChecked(event.target.checked);
  }}
/>

// ❌ WRONG - onCheckedChange doesn't exist for CheckboxField
<CheckboxField onCheckedChange={setChecked} />
```

### SelectField
```typescript
<SelectField
  value={selectedValue}
  options={[{ value: "opt1", label: "Option 1" }]}
  onChange={(option) => {
    if (option && !(option instanceof Array)) {
      setSelectedValue(option);
    }
  }}
/>
```

### Switch
```typescript
<Switch
  checked={isChecked}
  onCheckedChange={setIsChecked}
/>
```

## Authentication & Onboarding Pattern

```typescript
const Page = async ({ searchParams }: PageProps) => {
  const session = await getServerSession({
    req: buildLegacyRequest(await headers(), await cookies()),
  });
  
  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const organizationId = session.user.profile?.organizationId ?? null;
  const onboardingPath = await checkOnboardingRedirect(session.user.id, {
    checkEmailVerification: true,
    organizationId,
  });
  
  if (onboardingPath) {
    return redirect(onboardingPath);
  }

  return <YourComponent />;
};
```

## Metadata Pattern

```typescript
export const generateMetadata = async (): Promise<
  ReturnType<typeof _generateMetadata>
> =>
  await _generateMetadata(
    (t) => "Page Title",
    (t) => "Page subtitle",
    undefined,
    undefined,
    "/route-path"
  );
```

## Key Takeaways

1. **Always import form components from `@calcom/ui/components/form`**, not subdirectories
2. **"minus" icon doesn't exist** - use `"chevron-down"` or `"arrow-down"` instead
3. **CheckboxField uses `onChange`** with `event.target.checked`, not `onCheckedChange`
4. **Use route groups** `(use-page-wrapper)/(main-nav)` for pages with sidebar navigation
5. **Follow the pattern**: Server component (page.tsx) → Wrapper (client) → Content (client)
6. **ShellMainAppDir** provides consistent header/subtitle/CTA structure
7. **Always check authentication and onboarding** in server components

## File Locations Reference

- Navigation: `apps/web/modules/shell/navigation/`
- Page routes: `apps/web/app/(use-page-wrapper)/(main-nav)/`
- UI components: `packages/ui/components/`
- Icon names: `packages/ui/components/icon/icon-names.ts`
- Form components: `packages/ui/components/form/index.ts`
