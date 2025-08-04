# Permission-Based Access Control (PBAC) System

## Overview
The PBAC system provides fine-grained access control for Cal.com using a combination of CRUD-based permissions and custom actions, while maintaining backward compatibility with the existing role system.

## Implementation

### Permission Store
The system uses a centralized Zustand store with optimized data structures for fast permission lookups:

```typescript
interface TeamPermissions {
  roleId: string;
  permissions: Set<PermissionString>; // O(1) lookup
}

interface PermissionStore {
  teamPermissions: Map<number, TeamPermissions>; // O(1) lookup
  setTeamPermissions: (permissions: Record<number, { roleId: string; permissions: PermissionString[] }>) => void;
  hasPermission: (teamId: number, permission: PermissionString) => boolean;
  hasPermissions: (teamId: number, permissions: PermissionString[]) => boolean;
}
```

### Context Provider
The system uses a React context provider that fetches all permissions once at the root level:

```tsx
<PermissionProvider>
  <App />
</PermissionProvider>
```

The provider automatically:
- Fetches permissions for all teams the user has access to
- Caches the results (5-minute stale time)
- Updates the central store
- Provides loading states

### Permission Hooks
Two main hooks are provided for checking permissions:

```typescript
// Check single permission
const { hasPermission, isLoading } = usePermission(teamId, "team.update");

// Check multiple permissions
const { hasPermissions, isLoading } = usePermissions(teamId, ["team.update", "team.invite"]);
```

## Permission Format
Permissions follow two formats:
1. CRUD Permissions: `${resource}.${action}`
2. Custom Actions: `custom:${resource}.${action}`

```typescript
// CRUD Permission Examples
"eventType.create"
"booking.read"

// Custom Action Examples
"custom:team.invite"
"custom:booking.readRecordings"
```

## Role Types
1. **Default Roles** (MembershipRole)
   - OWNER: Full access (`*.*`)
   - ADMIN: Extensive management permissions
   - MEMBER: Basic read permissions

2. **Custom Roles**
   - Team-specific roles with granular permissions
   - Can be assigned alongside default roles

## Permission Structure

### CRUD Actions
```typescript
export enum CrudAction {
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}
```

### Custom Actions
```typescript
export enum CustomAction {
  Invite = 'invite',      // Invite members to team/org
  Remove = 'remove',      // Remove members from team/org
  Override = 'override',  // Override availability
  ReadRecordings = 'readRecordings', // Access booking recordings
  ManageBilling = 'manageBilling',   // Manage org billing
}
```

### Resources
```typescript
export enum Resource {
  EventType = 'eventType',
  Booking = 'booking',
  Team = 'team',
  Organization = 'organization',
  Insights = 'insights',
  Availability = 'availability',
  Workflow = 'workflow',
  RoutingForm = 'routingForm',
}
```

## Usage Guide

### 1. Setup Provider
```tsx
// app/layout.tsx or similar
import { PermissionProvider } from "@calcom/features/pbac/context/PermissionProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionProvider>
      {children}
    </PermissionProvider>
  );
}
```

### 2. Use in Components
```tsx
import { usePermission, usePermissions } from "@calcom/features/pbac/hooks/usePermission";

function TeamSettings({ teamId }: { teamId: number }) {
  // Single permission check
  const { hasPermission, isLoading } = usePermission(teamId, "team.update");
  
  // Multiple permissions check
  const { hasPermissions } = usePermissions(teamId, [
    "team.update",
    "team.invite"
  ]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {hasPermission && <button>Update Team</button>}
      {hasPermissions && <button>Update and Invite</button>}
    </div>
  );
}
```

### 3. Performance Considerations
- Permission checks are O(1) using Map and Set data structures
- Permissions are fetched once and cached for 5 minutes
- No redundant API calls for permission checks
- Automatic updates when permissions change via store

## Common Permission Combinations

### Event Manager Role
```typescript
const permissions = [
  // CRUD Permissions
  "eventType.create",
  "eventType.read",
  "eventType.update",
  "eventType.delete",
  
  // Custom Actions
  "custom:booking.readRecordings",
  "custom:availability.override"
];
```

### Analytics Role
```typescript
const permissions = [
  // CRUD Permissions
  "insights.read",
  "booking.read",
  "eventType.read",
  
  // Custom Actions
  "custom:organization.manageBilling"
];
```

### Team Admin Role
```typescript
const permissions = [
  // CRUD Permissions
  "team.create",
  "team.read",
  "team.update",
  
  // Custom Actions
  "custom:team.invite",
  "custom:team.remove",
  "custom:availability.override"
];
```

## Database Schema
```prisma
model Role {
  id          String   @id @default(cuid())
  name        String
  teamId      Int?
  permissions RolePermission[]
}

model RolePermission {
  id       String @id @default(cuid())
  roleId   String
  resource String
  action   String
  isCustom Boolean @default(false)  // Indicates if this is a custom action
  role     Role   @relation(fields: [roleId], references: [id])
}
```

## Example Use Cases

### 1. Event Type Management
```typescript
// Full event type management
[
  "eventType.create",
  "eventType.read",
  "eventType.update",
  "eventType.delete"
]

// Read-only access
["eventType.read"]
```

### 2. Team Management with Custom Actions
```typescript
[
  "team.read",
  "team.update",
  "custom:team.invite",
  "custom:team.remove"
]
```

### 3. Booking Management with Recordings
```typescript
[
  "booking.read",
  "booking.update",
  "custom:booking.readRecordings"
]
```

## Usage

### Server-Side (React Server Components)
```typescript
import { cookies, headers } from "next/headers";
import { checkUserPermissionInTeam } from "@calcom/features/pbac/lib/server/checkPermissions";

// In a Server Component
export default async function TeamSettings({ params }: { params: { teamId: string } }) {
  const session = buildLegacyRequest(await headers(), await cookies())

  if(!session?.user?.id){
    return null
  }

  const hasPermission = await checkUserPermissionInTeam({
    userId: session.user.id,
    teamId: parseInt(params.teamId),
    permission: "team.update",
  });

  if (!hasPermission) {
    return <div>Not authorized</div>;
  }

  return <div>Team Settings</div>;
}

// Check multiple permissions
const hasPermissions = await checkMultiplePermissionsInTeam({
  userId: session.user.id,
  teamId: teamId,
  permissions: ["team.update", "team.invite"],
});
```

### Client-Side (React Components)
```typescript
import { usePermission, usePermissions } from "@calcom/features/pbac/hooks/usePermission";

// In a React Component
function TeamSettingsButton({ teamId }: { teamId: number }) {
  // Single permission check
  const { hasPermission, isLoading } = usePermission(teamId, "team.update");
  
  if (isLoading) return <div>Loading...</div>;
  if (!hasPermission) return null;
  
  return <button>Update Team Settings</button>;
}

// Multiple permissions check
function TeamAdminPanel({ teamId }: { teamId: number }) {
  const { hasPermissions, isLoading } = usePermissions(teamId, [
    "team.update",
    "team.invite"
  ]);
  
  if (isLoading) return <div>Loading...</div>;
  if (!hasPermissions) return <div>Insufficient permissions</div>;
  
  return <div>Admin Panel</div>;
}
```

### Available Permissions

Permissions follow the format `resource.action` where:
- `resource` is the entity being accessed (e.g., team, eventType, booking)
- `action` is the operation being performed (e.g., create, read, update, delete)

Common permissions include:
- `team.create` - Create teams
- `team.update` - Update team settings
- `team.invite` - Invite team members
- `team.remove` - Remove team members
- `eventType.create` - Create event types
- `eventType.update` - Update event types
- `booking.read` - Read booking details

For a complete list of permissions, see [PERMISSIONS.md](./PERMISSIONS.md).

### Caching

The client-side hooks automatically cache permission results for 5 minutes to reduce API calls. The cache can be invalidated by calling the TRPC mutation to update permissions. 

## Default Roles and Permissions

The system comes with three pre-configured default roles:

### 1. Owner Role (owner_role)
- Has full access to all resources via wildcard permission (`*.*`)
- Automatically assigned to team/organization creators
- Cannot be modified or deleted
- Permissions:
  ```typescript
  "*.*" // Grants access to all actions on all resources
  ```

### 2. Admin Role (admin_role)
- Has extensive management permissions
- Can manage team settings and members
- Permissions:
  ```typescript
  // Booking permissions
  "booking.*"              // All booking operations
  "booking.readTeamBookings"
  "booking.readOrgBookings"
  
  // Event Type permissions
  "eventType.*"           // All event type operations
  
  // Team management
  "team.invite"
  "team.remove"
  "team.changeMemberRole"
  
  // Organization permissions
  "organization.listMembers"
  "organization.read"
  "organization.update"
  
  // Other resource permissions
  "apiKey.*"             // All API key operations
  "routingForm.*"        // All routing form operations
  "workflow.*"           // All workflow operations
  "insights.read"        // Read access to insights
  ```

### 3. Member Role (member_role)
- Basic read access to resources
- Default role for new team members
- Permissions:
  ```typescript
  "booking.read"
  "eventType.read"
  "team.read"
  "organization.read"
  "routingForm.read"
  ```

### Using Default Roles

You can reference these roles programmatically using the constants provided in `@calcom/features/pbac/lib/constants`:

```typescript
import { DEFAULT_ROLES } from "@calcom/features/pbac/lib/constants";

// Reference roles
const ownerRoleId = DEFAULT_ROLES.OWNER;   // 'owner_role'
const adminRoleId = DEFAULT_ROLES.ADMIN;    // 'admin_role'
const memberRoleId = DEFAULT_ROLES.MEMBER;  // 'member_role'
```

### Role Assignment

1. Default roles are automatically assigned during:
   - Team creation (creator gets OWNER role)
   - Member invitation (gets MEMBER role by default)
   - Role changes through team management UI

2. Roles can be changed by team owners and admins through:
   - Team member management interface
   - Organization member management interface
   - API endpoints (with proper permissions)
