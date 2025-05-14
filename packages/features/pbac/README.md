# Permission-Based Access Control (PBAC) System

## Overview
The PBAC system provides fine-grained access control for Cal.com, allowing teams to create custom roles with specific permissions while maintaining backward compatibility with the existing role system.

## Key Concepts

### Permission Format
Permissions follow the `resource.action` format:
```typescript
type Permission = `${Resource}.${Action}`;
// Example: "eventType.create", "booking.read"
```

### Role Types
1. **Default Roles** (MembershipRole)
   - OWNER: Full access (`*.*`)
   - ADMIN: Extensive management permissions
   - MEMBER: Basic read permissions

2. **Custom Roles**
   - Team-specific roles with granular permissions
   - Can be assigned alongside default roles

## Usage Guide

### 1. Creating Custom Roles
```typescript
const roleService = new RoleService(prisma);

// Create a role with specific permissions
await roleService.createRole({
  name: "Event Manager",
  teamId: 1,
  permissions: [
    "eventType.create",
    "eventType.update",
    "booking.read",
    "booking.update"
  ]
});
```

### 2. Assigning Roles to Members
```typescript
// Assign a custom role to a team member
await roleService.assignRoleToMember(roleId, membershipId);

// Remove a custom role
await roleService.removeRoleFromMember(membershipId);
```

### 3. Checking Permissions
```typescript
const permissionCheck = new PermissionCheckService(roleService);

// Check if a member has a specific permission
const canCreateEvent = await permissionCheck.hasPermission(
  {
    role: MembershipRole.MEMBER,
    customRoleId: "custom-role-id"
  },
  "eventType.create"
);
```

### 4. Managing Role Permissions
```typescript
// Update role permissions
await roleService.updateRolePermissions(roleId, [
  "eventType.create",
  "eventType.read"
]);

// Get all roles for a team
const teamRoles = await roleService.getTeamRoles(teamId);
```

## Permission Registry

### Available Resources
- `eventType`: Event type management
- `booking`: Booking management
- `team`: Team management
- `organization`: Organization management
- `insights`: Analytics and insights
- `availability`: Availability management
- `workflow`: Workflow management
- `routingForm`: Routing form management

### Available Actions
- `create`: Create new resources
- `read`: View resources
- `update`: Modify existing resources
- `delete`: Remove resources
- `manage`: Full control over resources
- `invite`: Invite members (team/org specific)
- `remove`: Remove members (team/org specific)
- `billing`: Manage billing (org specific)
- `override`: Override settings (availability specific)
- `readRecordings`: Access recordings (booking specific)

### Resource-Action Combinations

#### Event Types
- `eventType.create`: Create event types
- `eventType.read`: View event types
- `eventType.update`: Update event types
- `eventType.delete`: Delete event types
- `eventType.manage`: All actions on event types

#### Team
- `team.create`: Create teams
- `team.update`: Update team settings
- `team.invite`: Invite team members
- `team.remove`: Remove team members
- `team.manage`: All actions on teams

#### Organization
- `organization.invite`: Invite organization members
- `organization.remove`: Remove organization members
- `organization.billing`: Manage organization billing
- `organization.update`: Edit organization settings
- `organization.manage`: All actions on organizations

#### Booking
- `booking.read`: View bookings
- `booking.readRecordings`: View booking recordings
- `booking.update`: Update bookings
- `booking.manage`: All actions on bookings

#### Insights
- `insights.read`: View team insights and analytics
- `insights.manage`: Manage team insights and analytics

#### Availability
- `availability.read`: View availability
- `availability.update`: Update own availability
- `availability.override`: Override team member availability
- `availability.manage`: Manage all availability settings

#### Workflow
- `workflow.create`: Create workflows
- `workflow.read`: View workflows
- `workflow.update`: Update workflows
- `workflow.delete`: Delete workflows
- `workflow.manage`: All actions on workflows

#### Routing Forms
- `routingForm.create`: Create routing forms
- `routingForm.read`: View routing forms
- `routingForm.update`: Update routing forms
- `routingForm.delete`: Delete routing forms
- `routingForm.manage`: All actions on routing forms

### Categories
Permissions are organized into the following categories:
- `event`: Event type related permissions
- `team`: Team management permissions
- `org`: Organization management permissions
- `booking`: Booking related permissions
- `insights`: Analytics and reporting permissions
- `availability`: Availability management permissions
- `workflow`: Workflow related permissions
- `routing`: Routing form permissions

## Implementation Details

### Database Schema
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
  role     Role   @relation(fields: [roleId], references: [id])
}

model Membership {
  customRoleId String?  // Links to custom Role
  role         MembershipRole @default(MEMBER)
}
```

## Example Use Cases

### 1. Event Manager Role
```typescript
await roleService.createRole({
  name: "Event Manager",
  permissions: [
    "eventType.*",    // Full event type control
    "booking.read",   // Can view bookings
    "booking.update"  // Can update bookings
  ]
});
```

### 2. Viewer Role
```typescript
await roleService.createRole({
  name: "Viewer",
  permissions: [
    "eventType.read",
    "booking.read",
    "team.read"
  ]
});
```

### 3. Analytics Role
```typescript
await roleService.createRole({
  name: "Analytics",
  permissions: [
    "booking.read",
    "eventType.read",
    "organization.read"
  ]
});
``` 
