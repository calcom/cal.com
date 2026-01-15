# Permission-Based Access Control (PBAC)

## Overview

The PBAC system provides fine-grained access control for Cal.com using a combination of CRUD-based permissions and custom actions. It's designed to be flexible, performant, and maintain backward compatibility with the existing role system through fallback mechanisms.

## Default Roles

The system comes with three pre-configured default roles that form the foundation of the permission system:

### 1. Owner Role (`owner_role`)

- **Full Access**: Has access to all resources via wildcard permission (`*.*`)
- **Automatically assigned** to team/organization creators
- **Cannot be modified or deleted**
- **Permissions**: `*.*` grants access to all actions on all resources

### 2. Admin Role (`admin_role`)

- **Extensive management permissions** across most resources
- **Can manage** team settings, members, bookings, and more
- **Permissions include**:
  - **Event Types**: Full CRUD (`eventType.*`)
  - **Roles**: Full CRUD (`role.*`)
  - **Team Management**: `team.create`, `team.read`, `team.update`, `team.invite`, `team.remove`, `team.changeMemberRole`
  - **Organization**: `organization.read`, `organization.update`, `organization.listMembers`, `organization.invite`, `organization.remove`, `organization.manageBilling`, `organization.changeMemberRole`
  - **Bookings**: `booking.read`, `booking.update`, `booking.readTeamBookings`, `booking.readOrgBookings`, `booking.readRecordings`
  - **Insights**: `insights.read`
  - **Workflows**: Full CRUD (`workflow.*`)
  - **Routing Forms**: Full CRUD (`routingForm.*`)
  - **Webhooks**: Full CRUD (`webhook.*`)
  - **Availability**: `availability.read`, `availability.update`

### 3. Member Role (`member_role`)

- **Basic read access** to resources
- **Default role** for new team members
- **Permissions include**:
  - **Event Types**: `eventType.read`
  - **Team**: `team.read`
  - **Roles**: `role.read`
  - **Organization**: `organization.read`, `organization.listMembers`
  - **Bookings**: `booking.read`, `booking.update` (for their own bookings)
  - **Workflows**: `workflow.read`
  - **Routing Forms**: `routingForm.read`
  - **Availability**: `availability.read`, `availability.update` (for their own availability)

## How to Check Permissions

PBAC is currently behind a feature flag, so we use utility functions that automatically handle the fallback logic for you.

### Server-Side Permission Checks (React Server Components)

The recommended approach is to check permissions in RSC before rendering the page:

```typescript
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRole } from "@calcom/prisma/enums";

// In a Server Component or API route
async function MyServerComponent({ teamId, userId }: { teamId: number; userId: number }) {
  const permissionService = new PermissionCheckService();

  // Check a single permission
  const canUpdateTeam = await permissionService.checkPermission({
    userId,
    teamId,
    permission: "team.update",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  // Check multiple permissions (user must have ALL)
  const canManageMembers = await permissionService.checkPermissions({
    userId,
    teamId,
    permissions: ["team.invite", "team.remove"],
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!canUpdateTeam) {
    return <div>Not authorized</div>;
  }

  return <div>Team Settings</div>;
}
```

**Fallback Roles**: If PBAC is not enabled for the team, the system will check if the user has one of the specified `fallbackRoles` instead.

### Client-Side Permission Checks (React Components)

For client components or when you're deep in the component tree, use the TRPC router:

```typescript
import { trpc } from "@calcom/trpc/react";

function TeamSettingsButton({ teamId }: { teamId: number }) {
  // Check a single permission
  const { data: hasPermission, isLoading } = trpc.viewer.pbac.checkPermission.useQuery({
    teamId,
    permission: "team.update",
  });

  // Check multiple permissions
  const { data: hasPermissions } = trpc.viewer.pbac.checkPermissions.useQuery({
    teamId,
    permissions: ["team.update", "team.invite"],
  });

  if (isLoading) return <div>Loading...</div>;
  if (!hasPermission) return null;

  return <button>Update Team Settings</button>;
}
```

**Important**: These TRPC calls are automatically cached by React Query on the client, so you can call them multiple times throughout your component tree without worrying about redundant network requests (as long as the props are the same).

### Getting All Permissions for a Resource

If you need to check multiple permissions for a resource efficiently:

```typescript
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";

const permissionService = new PermissionCheckService();

// Get all permissions for a specific resource
const permissions = await permissionService.getResourcePermissions({
  userId,
  teamId,
  resource: Resource.EventType,
});

// permissions = ["eventType.create", "eventType.read", "eventType.update", "eventType.delete"]
```

**Warning**: This approach does NOT account for fallback roles. Only use this in places where you know PBAC is enabled and has been rolled out.

## Permission Format

Permissions follow the format: `resource.action`

### Resources

Available resources are defined in the `Resource` enum:

- `eventType` - Event types
- `team` - Team settings
- `organization` - Organization settings
- `booking` - Bookings
- `insights` - Analytics and insights
- `role` - Custom roles
- `routingForm` - Routing forms
- `workflow` - Workflows
- `webhook` - Webhooks
- `availability` - Availability schedules
- `ooo` - Out of office entries
- `watchlist` - Watchlist/blocklist entries
- `organization.attributes` - Organization attributes

### Actions

#### CRUD Actions

Standard create, read, update, delete operations:

- `create` - Create new resources
- `read` - View resources
- `update` - Modify resources
- `delete` - Remove resources
- `*` - All CRUD actions (wildcard)

#### Custom Actions

Special actions that don't fit the CRUD model:

- `invite` - Invite members to team/org
- `remove` - Remove members from team/org
- `changeMemberRole` - Change member roles
- `listMembers` - View team/org members
- `listMembersPrivate` - View private team/org members
- `manageBilling` - Manage organization billing
- `readTeamBookings` - View team bookings
- `readOrgBookings` - View organization bookings
- `readRecordings` - Access booking recordings
- `impersonate` - Impersonate team/org members

## Team vs Organization Permissions

The permission system has intelligent fallback logic for teams within organizations:

1. **Team-Level Check First**: When checking permissions for a team resource, the system first checks if the user has the required permission through their **team membership**.

2. **Organization-Level Fallback**: If the user doesn't have team-level permissions:
   - The system checks if the team belongs to an organization
   - If yes, it checks the user's **organization membership** permissions
   - Organization permissions can grant access to team resources

3. **Example Flow**:
   ```typescript
   // User is trying to access "eventType.read" on Team 123
   // Team 123 is part of Organization 456

   // 1. Check: Does user have "eventType.read" on Team 123?
   //    � No specific team permission

   // 2. Check: Does user have "eventType.read" on Organization 456?
   //    � Yes! User has org-level permission
   //    � Access granted
   ```

This allows organization admins to manage resources across all teams without needing explicit permissions on each team.

## Adding a New Permission

When you need to add a permission that doesn't exist in the registry, follow these steps:

### Step 1: Add to the Permission Registry

Update the `PERMISSION_REGISTRY` in `packages/features/pbac/domain/types/permission-registry.ts`:

```typescript
export const PERMISSION_REGISTRY: PermissionRegistry = {
  // ... existing resources

  [Resource.Booking]: {
    _resource: {
      i18nKey: "pbac_resource_booking",
    },
    // ... existing actions

    // Add your new custom action
    [CustomAction.Export]: {
      description: "Export booking data",
      category: "booking",
      i18nKey: "pbac_action_export",
      descriptionI18nKey: "pbac_desc_export_bookings",
      dependsOn: ["booking.read"], // Optional: specify dependencies
    },
  },
};
```

**Key Fields**:

- `description`: Human-readable description
- `category`: Grouping category for UI
- `i18nKey`: Translation key for action name
- `descriptionI18nKey`: Translation key for description
- `scope`: Optional array of `[Scope.Team]` or `[Scope.Organization]` to limit where permission appears
- `dependsOn`: Optional array of permissions that must be enabled when this permission is enabled
- `visibleWhen`: Optional visibility conditions (e.g., based on team privacy)

### Step 2: Create a Database Migration

Create a custom migration to add the permission to existing roles:

```bash
npx prisma migrate dev --create-only --name pbac_add_booking_export_permissions
```

### Step 3: Write the Migration SQL

Open the new migration file in `packages/prisma/migrations/[timestamp]_pbac_add_booking_export_permissions/migration.sql`:

```sql
-- Add the new "booking.export" permission to admin and owner roles

-- Owner role automatically gets it via wildcard (*.*) - no action needed!

-- Add to admin role
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
VALUES
  (gen_random_uuid(), 'admin_role', 'booking', 'export', NOW())
ON CONFLICT DO NOTHING;

-- Optionally add to member role if needed
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
VALUES
  (gen_random_uuid(), 'member_role', 'booking', 'export', NOW())
ON CONFLICT DO NOTHING;
```

**Important Notes**:

- **Owner Role**: Has `*.*` wildcard permission, so it automatically gets access to all new permissions. No migration needed!
- **Admin/Member Roles**: Must be explicitly granted new permissions through migrations
- Use `ON CONFLICT DO NOTHING` to make migrations idempotent
- Use `gen_random_uuid()` for IDs

### Step 4: Run the Migration

```bash
npx prisma migrate dev
```

### Step 5: Use Your New Permission

```typescript
// Server-side
const canExport = await permissionService.checkPermission({
  userId,
  teamId,
  permission: "booking.export",
  fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
});

// Client-side
const { data: canExport } = trpc.viewer.pbac.checkPermission.useQuery({
  teamId,
  permission: "booking.export",
});
```

## Practical Examples

### Example 1: Event Manager Role

A role for users who should manage events but not team settings:

```typescript
const eventManagerPermissions = [
  // Event Types
  "eventType.create",
  "eventType.read",
  "eventType.update",
  "eventType.delete",

  // Bookings
  "booking.read",
  "booking.update",
  "booking.readTeamBookings",

  // Workflows
  "workflow.create",
  "workflow.read",
  "workflow.update",
  "workflow.delete",

  // Basic team access
  "team.read",
];
```

### Example 2: Analytics Viewer Role

A role for users who should only view analytics:

```typescript
const analyticsViewerPermissions = [
  "insights.read",
  "booking.read",
  "booking.readTeamBookings",
  "eventType.read",
  "team.read",
];
```

### Example 3: Billing Manager Role

A role for users who manage billing but not content:

```typescript
const billingManagerPermissions = [
  "organization.read",
  "organization.manageBilling",
  "team.read",
  "organization.listMembers",
];
```

### Example 4: Checking Permissions in a Complex Feature

```typescript
// Check if user can perform multiple operations
async function canUserManageEvent(userId: number, teamId: number) {
  const permissionService = new PermissionCheckService();

  // Get all event type permissions at once
  const permissions = await permissionService.getResourcePermissions({
    userId,
    teamId,
    resource: Resource.EventType,
  });

  const permissionMap = PermissionMapper.toActionMap(permissions, Resource.EventType);

  return {
    canCreate: permissionMap[CrudAction.Create] ?? false,
    canRead: permissionMap[CrudAction.Read] ?? false,
    canUpdate: permissionMap[CrudAction.Update] ?? false,
    canDelete: permissionMap[CrudAction.Delete] ?? false,
  };
}
```

### Example 5: Conditional UI Rendering

```typescript
import { trpc } from "@calcom/trpc/react";

function TeamManagementPanel({ teamId }: { teamId: number }) {
  const { data: canInvite } = trpc.viewer.pbac.checkPermission.useQuery({
    teamId,
    permission: "team.invite",
  });

  const { data: canRemove } = trpc.viewer.pbac.checkPermission.useQuery({
    teamId,
    permission: "team.remove",
  });

  const { data: canChangeRoles } = trpc.viewer.pbac.checkPermission.useQuery({
    teamId,
    permission: "team.changeMemberRole",
  });

  return (
    <div>
      {canInvite && <InviteMemberButton teamId={teamId} />}
      {canRemove && <RemoveMemberButton teamId={teamId} />}
      {canChangeRoles && <ChangeRoleDropdown teamId={teamId} />}
    </div>
  );
}
```

## Best Practices

1. **Always use fallback roles** when checking permissions to maintain backward compatibility
2. **Check permissions in RSC** when possible for better performance and security
3. **Use `getResourcePermissions()`** when you need to check many permissions for the same resource
4. **Don't repeat permission checks** - TRPC caching handles this for you on the client
5. **Be specific with permissions** - Use fine-grained permissions rather than broad wildcards for custom roles
6. **Document custom permissions** - Add clear descriptions and i18n keys for better UX
7. **Test permission fallbacks** - Ensure your code works both with and without PBAC enabled

## Troubleshooting

### Permission checks always return false

- Verify the team has the PBAC feature flag enabled
- Check that the user has a membership in the team or parent organization
- Ensure the permission string format is correct (`resource.action`)
- Verify the permission exists in the `PERMISSION_REGISTRY`

### Custom role not showing in UI

- Check that you've run the database migration
- Verify the role has a `teamId` associated with it
- Ensure the user has `role.read` permission

### Organization permissions not working for team resources

- Verify the team has a `parentId` (organization)
- Check that the user is a member of the parent organization
- Ensure the permission is not scoped to only `[Scope.Team]` in the registry
