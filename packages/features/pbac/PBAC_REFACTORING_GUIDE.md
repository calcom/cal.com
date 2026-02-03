# PBAC Refactoring Guide

Quick guide for refactoring Cal.com to use Permission-Based Access Control (PBAC) instead of role-based checks and membership queries.

## Core Patterns

### 1. Team Filtering with PBAC (API/tRPC handlers)

**Before (Membership-based)**:

```typescript
const teamsToQuery = (
  await prisma.membership.findMany({
    where: {
      userId: ctx.user.id,
      accepted: true,
      NOT: [
        {
          role: MembershipRole.MEMBER,
          team: { isPrivate: true },
        },
      ],
    },
    select: { teamId: true },
  })
).map((membership) => membership.teamId);
```

**After (PBAC-based)**:

```typescript
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRole } from "@calcom/prisma/enums";

const permissionCheckService = new PermissionCheckService();
const teamsToQuery = await permissionCheckService.getTeamIdsWithPermission({
  userId: ctx.user.id,
  permission: "team.listMembers",
  fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
});
```

### 2. UI Permission Checks (React components)

**Before (Role-based)**:

```typescript
// Client-side role check with role-based variable name
const isTeamAdminOrOwner = user?.isTeamAdminOrOwner ?? false;
const canSeeMembers = isTeamAdminOrOwner;
```

**After (PBAC-based)**:

```typescript
// Server-side permission check in page/layout
import { MembershipRole } from "@calcom/prisma/enums";

const permissionCheckService = new PermissionCheckService();
const teamIdsWithPermission = await permissionCheckService.getTeamIdsWithPermission({
  userId: session.user.id,
  permission: "team.listMembers",
  fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
});

const permissions = {
  canListMembers: teamIdsWithPermission.length > 0,
};

// Pass to component
<MyComponent permissions={permissions} />;
```

## Key Points

### 1. Use Direct Permission Strings

- Use `"team.listMembers"` directly instead of `PermissionMapper.toPermissionString()`
- Simpler and more readable

### 2. No Fallback Logic Needed

- `getTeamIdsWithPermission()` handles errors internally
- Returns empty array `[]` when user has no permissions (this is legitimate)
- Don't assume empty array means PBAC failure

### 3. Server-Side Permission Checking

- **Move permission checks from client to server** - crucial for security
- Check permissions in page/layout components, not in UI components
- Pass permission results as props to maintain separation of concerns

### 4. Permissions Object Pattern

- Wrap permission booleans in a `permissions` object for extensibility
- Use descriptive names like `canListMembers` instead of raw permission strings
- Makes it easy to add more permissions later

### 5. Permission-Based Variable Naming

- **Use permission-specific names** like `canListMembers` instead of role-based names like `isTeamAdminOrOwner`
- Follow the pattern: `can[Action][Resource]` (e.g., `canListMembers`, `canUpdateTeam`, `canInviteUsers`)
- Makes code more readable and aligns with the actual permission being checked
- Easier to understand what specific action is being permitted

### 6. Team vs Personal Resources

**Rule**: Use `teamId` to determine if permission checks are needed:

- `teamId` present → Team resource → Check permissions
- `teamId` null/undefined → Personal resource → Check ownership only

**Example**: `booking.read` permission

- ✅ Has permission: Can read **all team members' bookings**
- ❌ No permission: Can **still read own bookings**, just not others'

```typescript
if (resource.teamId) {
  // Team resource - check permissions
  const hasPermission = await permissionService.hasPermission(userId, "resource.read", resource.teamId);
  if (!hasPermission) throw new ForbiddenError();
} else {
  // Personal resource - check ownership only
  if (resource.userId !== currentUserId) throw new ForbiddenError();
}
```

### 7. Common Team Permissions

- `"booking.read"` - Read all team members' bookings (not just own)
- `"team.listMembers"` - List team members
- `"team.read"` - View team details
- `"team.update"` - Edit team settings
- `"team.invite"` - Invite members
- `"team.remove"` - Remove members

## Step-by-Step Refactoring

### For API/tRPC Handlers

1. **Add imports**:

```typescript
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRole } from "@calcom/prisma/enums";
```

2. **Replace membership query**:

```typescript
const permissionCheckService = new PermissionCheckService();
const teamsToQuery = await permissionCheckService.getTeamIdsWithPermission({
  userId: ctx.user.id,
  permission: "team.listMembers",
  fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
});
```

3. **Keep existing privacy checks** - PBAC doesn't replace organization-level privacy logic

### For UI Components

1. **Move permission check to server** (page/layout component):

```typescript
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRole } from "@calcom/prisma/enums";

// In your page component
const permissionCheckService = new PermissionCheckService();
const teamIdsWithPermission = await permissionCheckService.getTeamIdsWithPermission({
  userId: session.user.id,
  permission: "team.listMembers",
  fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
});

const permissions = {
  canListMembers: teamIdsWithPermission.length > 0, // Permission-specific name
};
```

2. **Pass permissions as props**:

```typescript
<BookingsContent permissions={permissions} />
```

3. **Update component interface**:

```typescript
interface BookingsProps {
  permissions: {
    canListMembers: boolean;
  };
}
```

4. **Replace role checks in component**:

```typescript
// Replace: const isTeamAdminOrOwner = user?.isTeamAdminOrOwner ?? false
// With: const canListMembers = permissions.canListMembers

// Use permission-specific variable names throughout your component
```

## Examples

### API Handler: listSimpleMembers.handler.ts

**What changed**:

- Replaced 17 lines of membership query with 2 lines of PBAC
- Removed unnecessary imports and fallback logic
- Used direct permission string `"team.listMembers"`

**Result**: Cleaner, more maintainable code that respects fine-grained permissions.

### UI Component: Bookings Page

**What changed** (from PR #24006):

- Moved permission check from client (`user?.isTeamAdminOrOwner`) to server
- Added `permissions` prop with `canListMembers` boolean
- Used `teamIdsWithPermission.length > 0` pattern for UI control
- Added E2E test to verify member filter visibility

**Before**:

```typescript
// In component - role-based variable name
const isTeamAdminOrOwner = user?.isTeamAdminOrOwner ?? false;
const canSeeMembers = isTeamAdminOrOwner;
```

**After**:

```typescript
// In page component (server-side)
const permissions = {
  canListMembers: teamIdsWithPermission.length > 0,
};

// In UI component - permission-specific variable name
const canListMembers = permissions.canListMembers;
const canSeeMembers = canListMembers; // Use permission-specific name
```

**Result**: Secure server-side permission checking with clean UI separation.

## Verification

### For All Refactoring

- Run `yarn type-check:ci --force`
- Ensure existing privacy checks remain intact
- Test with users who have different permission levels

### For UI Refactoring

- Add E2E tests to verify UI element visibility based on permissions
- Test with different user roles (ADMIN, OWNER, MEMBER)
- Verify that permission checks happen server-side, not client-side
- Confirm that UI elements are properly hidden/shown based on `permissions` props

### Common Pitfalls

- **Don't check permissions client-side** - always do it server-side for security
- **Don't assume empty array means failure** - it's valid when user has no permissions
- **Remember to update TypeScript interfaces** when adding new permission props
- **Don't use role-based variable names** - use permission-specific names instead

## Variable Naming Best Practices

### ✅ Good: Permission-Specific Names

```typescript
const canListMembers = permissions.canListMembers;
const canUpdateTeam = permissions.canUpdateTeam;
const canInviteUsers = permissions.canInviteUsers;
const canDeleteBookings = permissions.canDeleteBookings;
```

### ❌ Bad: Role-Based Names

```typescript
const isTeamAdminOrOwner = user?.isTeamAdminOrOwner;
const isAdmin = user?.role === "ADMIN";
const hasPermission = user?.isTeamAdminOrOwner;
```

### Naming Convention

- Use the pattern: `can[Action][Resource]`
- Examples: `canListMembers`, `canUpdateTeam`, `canInviteUsers`
- Makes code self-documenting and easier to understand
- Aligns variable names with the actual permissions being checked
