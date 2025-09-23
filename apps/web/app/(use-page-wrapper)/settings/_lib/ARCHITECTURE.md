# Settings Layout Permission System Architecture

## Overview

This new architecture provides a clean, declarative approach to managing settings tabs and permissions, replacing the scattered permission logic with a centralized, maintainable system.

## Key Components

### 1. Tab Registry (`tabs/tab-registry.ts`)
- **Purpose**: Single source of truth for all settings tabs
- **Structure**: Declarative configuration with permissions embedded
- **Benefits**: Easy to add/modify tabs, clear permission requirements

### 2. Permission Types (`tabs/types.ts`)
- **PermissionContext**: All permission data in one place
- **TabConfig**: Declarative tab structure with permissions
- **ProcessedTab**: Runtime representation of visible tabs

### 3. Permission Resolver (`tabs/permission-resolver.ts`)
- **Purpose**: Centralized permission checking logic
- **Features**:
  - Visibility rules (org required, hosted only, etc.)
  - Role-based permissions (admin, org roles, team roles)
  - Feature flag support
  - PBAC resource permissions
  - Custom permission functions

### 4. Zustand Store (`stores/settings-store.ts`)
- **Purpose**: Centralized state management
- **Features**:
  - Tab filtering based on permissions
  - Team expansion state management
  - Dynamic tab updates
  - Permission context storage

### 5. Server Component (`layout-new.tsx`)
- **Purpose**: Fetch all permissions on the server
- **Benefits**:
  - Single data fetch
  - Type-safe permission passing
  - Cached permission lookups
  - No client-side permission fetching

### 6. Client Components
- **SettingsLayoutAppDirClient-new.tsx**: Clean layout wrapper
- **SettingsSidebar.tsx**: Simplified sidebar rendering
- **TeamCollapsible.tsx**: Dedicated team management
- **MobileSettingsContainer.tsx**: Mobile navigation

### 7. Hooks (`hooks/useSettingsTabs.ts`)
- **useSettingsTabs**: Access and search tabs
- **useTeamExpansion**: Manage team collapsibles
- **useSettingsPermissions**: Check specific permissions

## Benefits

### 1. **Maintainability**
- Single source of truth for tabs
- Clear permission requirements
- Separated concerns

### 2. **Testability**
- Isolated permission logic
- Pure functions for resolution
- Mockable store

### 3. **Performance**
- Server-side permission resolution
- Cached permission checks
- Minimal re-renders with Zustand

### 4. **Developer Experience**
- Declarative tab configuration
- Type-safe throughout
- Easy to extend

## Usage Example

### Adding a New Tab

```typescript
// In tab-registry.ts
{
  key: "new_feature",
  name: "New Feature",
  href: "/settings/new-feature",
  icon: "star",
  permissions: {
    features: ["new-feature-flag"],
    orgRoles: ["ADMIN", "OWNER"],
    resources: [{
      resource: Resource.NewFeature,
      action: CrudAction.Read
    }]
  },
  visibility: {
    requiresOrg: true,
    hostedOnly: true
  }
}
```

### Checking Permissions in Components

```typescript
import { useSettingsPermissions } from "../_lib/hooks/useSettingsTabs";

function MyComponent() {
  const { hasFeature, isOrgAdmin } = useSettingsPermissions();

  if (!hasFeature("new-feature") || !isOrgAdmin()) {
    return null;
  }

  return <div>Admin-only feature content</div>;
}
```

## Migration Path

1. The new system runs alongside the old one (files with `-new` suffix)
2. Test thoroughly with various permission combinations
3. Replace old components with new ones
4. Remove old permission logic

## Future Improvements

1. **Dynamic Tab Loading**: Load tab configs from API
2. **Permission Caching**: More aggressive caching strategies
3. **Tab Templates**: Reusable tab configurations
4. **Permission Debugging**: Dev tools for permission inspection