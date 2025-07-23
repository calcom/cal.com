# PBAC Organization Setup Guide

This guide explains how to create an organization with custom roles using the Permission-Based Access Control (PBAC) system in Cal.com.

## Overview

The PBAC system allows you to create fine-grained permissions for team members beyond the basic OWNER/ADMIN/MEMBER roles. This setup creates:

- **Custom Roles** with specific permissions
- **Organization** with PBAC enabled
- **Users** assigned to custom roles
- **Team** within the organization
- **Event Types** for demonstration

## Quick Start

### Option 1: Run the standalone PBAC seed script

```bash
# Run only the PBAC organization creation
npx tsx packages/prisma/seed-pbac-only.ts

# Verify the setup
npx tsx packages/prisma/verify-pbac-setup.ts

# Clean up when done (optional)
npx tsx packages/prisma/cleanup-pbac.ts
```

### Option 2: Include in main seed

The PBAC organization is automatically created when you run the main seed:

```bash
# Run the full seed (includes PBAC organization)
yarn db:seed
```

## What Gets Created

### 1. Organization: "PBAC Demo Organization"

- **Slug**: `pbac-demo-org`
- **URL**: `http://localhost:3000/org/pbac-demo-org`
- **Features**: PBAC enabled, verified organization

### 2. Custom Roles

#### Event Manager Role

- **Permissions**: Create/manage event types, view bookings and recordings
- **Color**: Blue (#3B82F6)
- **Use Case**: Team members who manage scheduling and events

**Permissions:**

- `eventType.*` (create, read, update, delete)
- `booking.read`, `booking.update`, `booking.readRecordings`
- `team.read`
- `availability.override`

#### Analytics Specialist Role

- **Permissions**: View insights, reports, and booking analytics
- **Color**: Green (#10B981)
- **Use Case**: Data analysts and reporting specialists

**Permissions:**

- `insights.read`
- `booking.read`, `booking.readTeamBookings`, `booking.readOrgBookings`
- `eventType.read`
- `team.read`, `organization.read`, `organization.listMembers`
- `routingForm.read`

#### Team Coordinator Role

- **Permissions**: Manage team members, workflows, and routing forms
- **Color**: Purple (#8B5CF6)
- **Use Case**: Team leads and coordinators

**Permissions:**

- `team.*` (read, update, invite, remove, changeMemberRole)
- `organization.read`, `organization.listMembers`
- `workflow.*` (create, read, update, delete)
- `routingForm.*` (create, read, update, delete)
- `booking.read`, `eventType.read`

#### Support Agent Role

- **Permissions**: Limited access for customer support
- **Color**: Amber (#F59E0B)
- **Use Case**: Customer support representatives

**Permissions:**

- `booking.read`, `booking.update`
- `eventType.read`
- `team.read`, `organization.read`

### 3. Users with Roles

| User                 | Email                     | Password          | Role   | Custom Role          |
| -------------------- | ------------------------- | ----------------- | ------ | -------------------- |
| Organization Owner   | owner@pbac-demo.com       | pbac-owner-2024!  | OWNER  | -                    |
| Event Manager        | events@pbac-demo.com      | events-2024!      | MEMBER | Event Manager        |
| Analytics Specialist | analytics@pbac-demo.com   | analytics-2024!   | MEMBER | Analytics Specialist |
| Team Coordinator     | coordinator@pbac-demo.com | coordinator-2024! | ADMIN  | Team Coordinator     |
| Support Agent        | support@pbac-demo.com     | support-2024!     | MEMBER | Support Agent        |

### 4. Team: "Sales Team"

- **Slug**: `sales-team`
- **URL**: `http://localhost:3000/team/sales-team`
- **Members**: All users above
- **Event Types**: Sales Consultation (30min), Product Demo (45min)

## Testing the PBAC System

### 1. Login as Different Users

Test the permission system by logging in as different users:

```bash
# Login URLs (after running the seed)
http://localhost:3000/auth/login

# Use the credentials from the table above
```

### 2. Test Permission Scenarios

#### Event Manager (events@pbac-demo.com)

- ✅ Can create/edit event types
- ✅ Can view bookings and recordings
- ❌ Cannot invite team members
- ❌ Cannot access insights/analytics

#### Analytics Specialist (analytics@pbac-demo.com)

- ✅ Can view insights and reports
- ✅ Can view all bookings
- ❌ Cannot create/edit event types
- ❌ Cannot manage team members

#### Team Coordinator (coordinator@pbac-demo.com)

- ✅ Can invite/remove team members
- ✅ Can manage workflows and routing forms
- ✅ Can change member roles
- ❌ Cannot create event types (unless given permission)

#### Support Agent (support@pbac-demo.com)

- ✅ Can view bookings (for support)
- ✅ Can reschedule/cancel bookings
- ❌ Cannot access insights
- ❌ Cannot manage team members

### 3. Using PBAC in Code

#### Client-Side Permission Checks

```tsx
import { usePermission, usePermissions } from "@calcom/features/pbac/hooks/usePermission";

function EventTypeManager({ teamId }: { teamId: number }) {
  const { hasPermission, isLoading } = usePermission(teamId, "eventType.create");

  if (isLoading) return <div>Loading...</div>;
  if (!hasPermission) return <div>Access denied</div>;

  return <button>Create Event Type</button>;
}

// Multiple permissions
function TeamAdminPanel({ teamId }: { teamId: number }) {
  const { hasPermissions } = usePermissions(teamId, ["team.invite", "team.remove", "team.changeMemberRole"]);

  if (!hasPermissions) return null;

  return <div>Team Management Panel</div>;
}
```

#### Server-Side Permission Checks

```typescript
import { checkUserPermissionInTeam } from "@calcom/features/pbac/lib/server/checkPermissions";

// In API routes or server components
const hasPermission = await checkUserPermissionInTeam({
  userId: session.user.id,
  teamId: teamId,
  permission: "eventType.create",
});

if (!hasPermission) {
  return { error: "Insufficient permissions" };
}
```

## Customizing Roles

### Creating Additional Custom Roles

You can extend the seed script to create more roles:

```typescript
// Add to createCustomRoles function
const customRole = await prisma.role.create({
  data: {
    id: `custom_role_${organizationId}`,
    name: "Custom Role Name",
    description: "Role description",
    color: "#FF5733",
    teamId: organizationId,
    type: RoleType.CUSTOM,
    permissions: {
      create: [
        { resource: "eventType", action: "read" },
        { resource: "booking", action: "read" },
        // Add more permissions as needed
      ],
    },
  },
  include: {
    permissions: true,
  },
});
```

### Available Permissions

Common permission patterns:

```typescript
// CRUD Permissions
"eventType.create";
"eventType.read";
"eventType.update";
"eventType.delete";

// Custom Actions
"booking.readRecordings";
"team.invite";
"team.remove";
"organization.manageBilling";
"availability.override";

// Wildcard (use with caution)
"*.*"; // All permissions (Owner role)
"eventType.*"; // All event type permissions
// See permission registery for more infomation
```

## Database Schema

The PBAC system uses these key tables:

```sql
-- Custom roles
Role {
  id: String (e.g., "event_manager_123")
  name: String
  teamId: Int (organization ID)
  type: RoleType (CUSTOM)
}

-- Role permissions
RolePermission {
  roleId: String
  resource: String (e.g., "eventType")
  action: String (e.g., "create")
}

-- User memberships with custom roles
Membership {
  userId: Int
  teamId: Int
  role: MembershipRole (OWNER/ADMIN/MEMBER)
  customRoleId: String? (references Role.id)
}
```

## Troubleshooting

### Common Issues

1. **Permissions not working**: Ensure the PBAC feature is enabled 

2. **Role not found**: Check that the custom role was created successfully and the `customRoleId` is set in the membership.

3. **Permission denied**: Verify the user has the correct role assignment and the permission exists in the role.

### Debugging

```typescript
// Check user's permissions
const membership = await prisma.membership.findFirst({
  where: { userId, teamId },
  include: { customRole: { include: { permissions: true } } },
});

console.log("User permissions:", membership?.customRole?.permissions);
```

## Next Steps

1. **Integrate with UI**: Use the permission hooks in your React components
2. **Add API Protection**: Use server-side permission checks in API routes
3. **Create Role Management UI**: Build interfaces for admins to manage custom roles
4. **Extend Permissions**: Add new resources and actions as needed

For more details, see the [PBAC README](../features/pbac/README.md).
