# Cal.com AI Agent Guide

This guide helps AI agents quickly understand common patterns, pitfalls, and solutions for working on Cal.com.

## Quick Start

### Project Structure
- **Monorepo** using Yarn workspaces and Turbo
- **Main app**: `apps/web/` (Next.js 13+ with App Router)
- **Packages**: `packages/` (UI, features, prisma, trpc, etc.)
- **Documentation**: `agents/` directory contains comprehensive guides

### Key Commands
```bash
# Development
yarn dev                    # Start dev server
yarn dx                     # Dev with database setup (requires Docker)

# Type checking
yarn type-check:ci --force  # Always use --force for fresh results

# Linting
yarn lint:fix               # Auto-fix linting issues

# Testing
TZ=UTC yarn test            # Unit tests (always use TZ=UTC)
PLAYWRIGHT_HEADLESS=1 yarn e2e [file]  # E2E tests

# Database
yarn prisma generate        # After schema changes
yarn workspace @calcom/prisma db-migrate  # Run migrations
```

## Common Patterns

### 1. Route Structure (App Router)

**Pattern**: Server Component → Wrapper (Client) → Content (Client)

```
apps/web/app/(use-page-wrapper)/(main-nav)/[route-name]/
  ├── page.tsx              # Server: Auth, data fetching, metadata
  ├── [Name]Wrapper.tsx     # Client: ShellMainAppDir wrapper
  └── [Name]Content.tsx     # Client: Actual UI content
```

**Route Groups**:
- `(use-page-wrapper)` - Adds PageWrapper + AppProviders (theme, analytics, etc.)
- `(main-nav)` - Adds Shell (SideBar, header, navigation)
- `(booking-page-wrapper)` - For public booking pages

**Example Pattern**:
```typescript
// page.tsx (Server Component)
const Page = async ({ searchParams }: PageProps) => {
  const session = await getServerSession({ ... });
  if (!session?.user?.id) return redirect("/auth/login");
  
  // Check onboarding
  const onboardingPath = await checkOnboardingRedirect(...);
  if (onboardingPath) return redirect(onboardingPath);
  
  return <YourWrapper />;
};

// [Name]Wrapper.tsx (Client Component)
export function YourWrapper() {
  return (
    <ShellMainAppDir
      heading="Page Title"
      subtitle="Page description"
      CTA={<Button>Action</Button>}
    >
      <YourContent />
    </ShellMainAppDir>
  );
}
```

### 2. UI Component Imports

**CRITICAL**: Always import form components from the main module, NOT subdirectories!

```typescript
// ✅ CORRECT
import { Input, SelectField, Switch, CheckboxField } from "@calcom/ui/components/form";

// ❌ WRONG - Causes "Module not found" errors
import { Input } from "@calcom/ui/components/form/inputs/TextField";
import { CheckboxField } from "@calcom/ui/components/form/checkbox";
```

**Other common imports**:
```typescript
import { Button } from "@calcom/ui/components/button";
import { Badge } from "@calcom/ui/components/badge";
import { FormCard, FormCardBody } from "@calcom/ui/components/card";
import { Alert } from "@calcom/ui/components/alert";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { Icon } from "@calcom/ui/components/icon";
```

### 3. Icon Names

**IMPORTANT**: Check `packages/ui/components/icon/icon-names.ts` for available icons.

**Common mistakes**:
- ❌ `"minus"` does NOT exist - use `"chevron-down"` or `"arrow-down"`
- ❌ Custom icon names won't work - only what's in icon-names.ts

**Common icons for buttons**:
- Increment: `"plus"`, `"chevron-up"`, `"arrow-up"`
- Decrement: `"chevron-down"`, `"arrow-down"`
- Actions: `"check"`, `"x"`, `"trash-2"`, `"edit-3"`, `"refresh-cw"`
- Navigation: `"calendar"`, `"clock"`, `"settings"`, `"user"`, `"users"`

### 4. Form Component Usage

#### CheckboxField
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

#### SelectField
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

#### Switch
```typescript
<Switch
  checked={isChecked}
  onCheckedChange={setIsChecked}  // ✅ Switch uses onCheckedChange
/>
```

### 5. Navigation Menu

**Location**: `apps/web/modules/shell/navigation/Navigation.tsx`

**Add new menu item**:
```typescript
const getNavigationItems = (...): NavigationItemType[] => [
  {
    name: "my_new_page",  // Translation key
    href: "/my-new-page",
    icon: "calendar",      // IconName
    badge: <MyBadge />,    // Optional badge
    moreOnMobile: true,    // Optional: hide on mobile bottom nav
    isCurrent: ({ pathname }) => pathname?.startsWith("/my-new-page") ?? false,
  },
  // ...
];
```

**Type definition**:
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

### 6. Authentication & Onboarding Pattern

Always include in server components:
```typescript
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
```

### 7. Metadata Pattern

```typescript
export const generateMetadata = async (): Promise<
  ReturnType<typeof _generateMetadata>
> =>
  await _generateMetadata(
    (t) => "Page Title",           // Title function
    (t) => "Page subtitle",        // Subtitle function
    undefined,                      // Optional image
    undefined,                      // Optional other
    "/route-path"                   // Route path
  );
```

## Common Pitfalls & Solutions

### 1. "Module not found" for form components
**Problem**: Importing from subdirectories like `@calcom/ui/components/form/checkbox`

**Solution**: Always import from `@calcom/ui/components/form`

### 2. "minus" icon doesn't exist
**Problem**: Trying to use `StartIcon="minus"` for decrement buttons

**Solution**: Use `"chevron-down"` or `"arrow-down"` instead

### 3. CheckboxField onChange pattern
**Problem**: Using `onCheckedChange` (that's for Switch, not CheckboxField)

**Solution**: Use `onChange={(event) => setChecked(event.target.checked)}`

### 4. Type errors after schema changes
**Problem**: Missing types after Prisma schema updates

**Solution**: Run `yarn prisma generate` to regenerate TypeScript types

### 5. Test timezone issues
**Problem**: Tests failing due to timezone differences

**Solution**: Always use `TZ=UTC` prefix: `TZ=UTC yarn test`

### 6. SelectField onChange type
**Problem**: Type errors with SelectField onChange callback

**Solution**: Check if option is array: `if (option && !(option instanceof Array))`

## Key File Locations

### Navigation & Shell
- `apps/web/modules/shell/navigation/Navigation.tsx` - Main navigation items
- `apps/web/modules/shell/navigation/NavigationItem.tsx` - Navigation component
- `apps/web/modules/shell/useBottomNavItems.ts` - Bottom nav items
- `apps/web/modules/shell/SideBar.tsx` - Sidebar container
- `apps/web/app/(use-page-wrapper)/(main-nav)/ShellMainAppDir.tsx` - Page wrapper

### UI Components
- `packages/ui/components/` - All UI components
- `packages/ui/components/form/index.ts` - Form exports (import from here!)
- `packages/ui/components/icon/icon-names.ts` - Available icon names

### Routes & Pages
- `apps/web/app/` - All routes (App Router)
- `apps/web/pages/` - Legacy Pages Router (being phased out)

### Database
- `packages/prisma/schema.prisma` - Database schema
- `packages/prisma/migrations/` - Migration files

### API
- `packages/trpc/server/routers/` - tRPC routers
- `apps/web/app/api/` - Next.js API routes

### Features
- `packages/features/` - Feature-specific code
- `packages/app-store/` - Third-party integrations

## Development Workflow

### Creating a New Page

1. **Create route structure**:
   ```
   apps/web/app/(use-page-wrapper)/(main-nav)/your-page/
     ├── page.tsx
     ├── YourPageWrapper.tsx
     └── YourPageContent.tsx
   ```

2. **Server component** (page.tsx):
   - Handle authentication
   - Check onboarding
   - Fetch data (if needed)
   - Generate metadata

3. **Wrapper component** (client):
   - Use `ShellMainAppDir` for consistent layout
   - Add heading, subtitle, CTA if needed

4. **Content component** (client):
   - Implement UI
   - Handle state and interactions

5. **Add to navigation** (if needed):
   - Edit `apps/web/modules/shell/navigation/Navigation.tsx`
   - Add translation keys to locale files

### Before Committing

1. ✅ Run `yarn type-check:ci --force`
2. ✅ Run `yarn lint:fix`
3. ✅ Run relevant tests: `TZ=UTC yarn test [file]`
4. ✅ Check build: `yarn build` (if changing core files)
5. ✅ Verify no secrets/keys committed

## Type Checking

**Always use `--force` flag** to bypass cache and get fresh results:
```bash
yarn type-check:ci --force
```

This is especially important when:
- Making import changes
- Adding new components
- Modifying types
- After pulling changes

## Best Practices

1. **Use `select` not `include`** in Prisma queries (better performance)
2. **Early returns** to reduce nesting
3. **Type imports**: `import type { X }` for types only
4. **Never expose `credential.key`** in API responses
5. **Conventional commits**: `feat:`, `fix:`, `refactor:`, etc.
6. **Small PRs**: <500 lines, <10 files when possible
7. **Server components** for data fetching and auth
8. **Client components** for interactivity and state

## Documentation References

- **Agents directory**: `agents/` - Comprehensive guides
  - `agents/README.md` - Architecture overview
  - `agents/commands.md` - Command reference
  - `agents/knowledge-base.md` - Domain knowledge
  - `agents/coding-standards.md` - Coding standards

- **Main README**: `README.md` - Project setup and overview

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Module not found (form components) | Import from `@calcom/ui/components/form` |
| Icon name doesn't exist | Check `packages/ui/components/icon/icon-names.ts` |
| Type errors after schema change | Run `yarn prisma generate` |
| Test timezone failures | Use `TZ=UTC` prefix |
| Build errors after pull | Run `yarn install` then `yarn prisma generate` |
| Can't find component | Check `packages/ui/components/[component]/index.ts` for exports |

## Important Notes

- **Never commit secrets or API keys**
- **Always check authentication** in server components
- **Use TZ=UTC for tests** to avoid timezone issues
- **Import form components** from main module, not subdirectories
- **Check icon names** before using - many don't exist
- **Run type-check with --force** for fresh results
- **Small, focused PRs** are preferred over large changes
