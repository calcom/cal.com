# Permission-Based Access Control (PBAC) System

## Overview
The PBAC system provides fine-grained access control for Cal.com using a combination of CRUD-based permissions and custom actions, while maintaining backward compatibility with the existing role system.

## Key Concepts

### Permission Format
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

### Role Types
1. **Default Roles** (MembershipRole) (TODO) - We need to make a list of what permissions these get by default.
   - OWNER: Full access (`*.*`)
   - ADMIN: Extensive management permissions
   - MEMBER: Basic read permissions

2. **Custom Roles**
   - Team-specific roles with granular permissions
   - Can be assigned alongside default roles (For now - until we have a seeder or something)

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
  Manage = 'manage',      // Full control over a resource
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

### 1. Creating Custom Roles
```typescript
const roleService = new RoleService(prisma);

// Create a role with CRUD and custom permissions
await roleService.createRole({
  name: "Event Manager",
  teamId: 1,
  permissions: [
    "eventType.create",           // CRUD permission
    "eventType.read",            // CRUD permission
    "custom:team.invite",        // Custom action
    "custom:booking.readRecordings" // Custom action
  ]
});
```

### 2. Checking Permissions
```typescript
const permissionCheck = new PermissionCheckService(roleService);

// Check CRUD permission
const canCreateEvent = await permissionCheck.hasPermission(
  membership,
  "eventType.create"
);

// Check custom action
const canReadRecordings = await permissionCheck.hasPermission(
  membership,
  "custom:booking.readRecordings"
);
```

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
