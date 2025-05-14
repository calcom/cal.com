# Permission-Based Access Control (PBAC) Implementation Guide

## Overview
This document outlines the implementation of a Permission-Based Access Control (PBAC) system where permissions follow the format `"resource".action`. The system will support custom roles for organizations and teams, with permissions stored in a registry rather than the database.

## Schema Changes Required

### 1. Permission Registry
```typescript
// types/permission-registry.ts
export type Permission = {
  resource: string;
  action: string;
  description: string;
  category: string;
};

export const PERMISSIONS: Permission[] = [
  // Booking permissions
  { resource: "booking", action: "create", description: "Create new bookings", category: "booking" },
  { resource: "booking", action: "read", description: "View bookings", category: "booking" },
  { resource: "booking", action: "update", description: "Update bookings", category: "booking" },
  { resource: "booking", action: "delete", description: "Delete bookings", category: "booking" },
  
  // Event type permissions
  { resource: "eventType", action: "create", description: "Create event types", category: "event" },
  { resource: "eventType", action: "read", description: "View event types", category: "event" },
  { resource: "eventType", action: "update", description: "Update event types", category: "event" },
  { resource: "eventType", action: "delete", description: "Delete event types", category: "event" },
  
  // Team permissions
  { resource: "team", action: "manage", description: "Manage team settings", category: "team" },
  { resource: "team", action: "invite", description: "Invite team members", category: "team" },
  { resource: "team", action: "remove", description: "Remove team members", category: "team" },
  
  // Organization permissions
  { resource: "organization", action: "manage", description: "Manage organization settings", category: "org" },
  { resource: "organization", action: "billing", description: "Manage organization billing", category: "org" },
];
```

### 2. Database Schema Changes

```prisma
// New models to add to schema.prisma

model Role {
  id          String   @id @default(cuid())
  name        String
  description String?
  teamId      Int?     // null for organization roles
  team        Team?    @relation(fields: [teamId], references: [id], onDelete: Cascade)
  permissions RolePermission[]
  memberships Membership[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([name, teamId])
  @@index([teamId])
}

model RolePermission {
  id        String   @id @default(cuid())
  roleId    String
  role      Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  resource  String
  action    String
  createdAt DateTime @default(now())

  @@unique([roleId, resource, action])
  @@index([roleId])
}

// Update Membership model to include customRole while maintaining existing role
model Membership {
  // ... existing fields ...
  role                 MembershipRole
  customRoleId         String?
  customRole           Role?           @relation(fields: [customRoleId], references: [id])
  disableImpersonation Boolean         @default(false)
  createdAt            DateTime?
  updatedAt            DateTime?       @updatedAt

  @@index([customRoleId])
}
```

### 3. Permission Check Logic

```typescript
// services/permission-check.service.ts
export class PermissionCheckService {
  async hasPermission(membership: Membership, permission: string): Promise<boolean> {
    // First check if user has a custom role
    if (membership.customRoleId) {
      const hasCustomPermission = await this.checkCustomRolePermission(
        membership.customRoleId,
        permission
      );
      if (hasCustomPermission) return true;
    }

    // Fall back to default role permissions
    return this.checkDefaultRolePermission(membership.role, permission);
  }

  private checkDefaultRolePermission(role: MembershipRole, permission: string): boolean {
    // Define default permissions for each role
    const defaultPermissions: Record<MembershipRole, string[]> = {
      [MembershipRole.OWNER]: ["*.*"], // Owner has all permissions
      [MembershipRole.ADMIN]: [
        "booking.*",
        "eventType.*",
        "team.invite",
        "team.remove",
        // Add other admin permissions
      ],
      [MembershipRole.MEMBER]: [
        "booking.read",
        "eventType.read",
        // Add other member permissions
      ],
    };

    const rolePermissions = defaultPermissions[role] || [];
    return rolePermissions.some(p => this.permissionMatches(p, permission));
  }

  private async checkCustomRolePermission(roleId: string, permission: string): Promise<boolean> {
    const rolePermissions = await this.roleService.getRolePermissions(roleId);
    return rolePermissions.some(p => 
      p.resource === permission.split('.')[0] && 
      p.action === permission.split('.')[1]
    );
  }

  private permissionMatches(pattern: string, permission: string): boolean {
    if (pattern === "*.*") return true;
    const [patternResource, patternAction] = pattern.split('.');
    const [permissionResource, permissionAction] = permission.split('.');
    
    return (
      (patternResource === "*" || patternResource === permissionResource) &&
      (patternAction === "*" || patternAction === permissionAction)
    );
  }
}
```

## Services Implementation

### 1. Permission Service
```typescript
// services/permission.service.ts
export class PermissionService {
  validatePermission(permission: string): boolean {
    const [resource, action] = permission.split('.');
    return PERMISSIONS.some(p => p.resource === resource && p.action === action);
  }

  validatePermissions(permissions: string[]): boolean {
    return permissions.every(permission => this.validatePermission(permission));
  }

  getAllPermissions(): Permission[] {
    return PERMISSIONS;
  }

  getPermissionsByCategory(category: string): Permission[] {
    return PERMISSIONS.filter(p => p.category === category);
  }
}
```

### 2. Role Service
```typescript
// services/role.service.ts
export class RoleService {
  async createRole(data: {
    name: string;
    description?: string;
    teamId?: number;
    permissions: string[];
  }) {
    // Validate permissions
    const permissionService = new PermissionService();
    if (!permissionService.validatePermissions(data.permissions)) {
      throw new Error('Invalid permissions provided');
    }

    // Create role with permissions
    // Implementation details...
  }

  async assignRoleToMember(roleId: string, membershipId: number) {
    // Assign role to membership
    // Implementation details...
  }

  async getRolePermissions(roleId: string): Promise<RolePermission[]> {
    // Get permissions for a role
    // Implementation details...
  }
}
```

## Use Cases

### 1. Creating Custom Roles
```typescript
// usecases/create-role.usecase.ts
export class CreateRoleUseCase {
  constructor(
    private roleService: RoleService,
    private permissionService: PermissionService
  ) {}

  async execute(data: {
    name: string;
    description?: string;
    teamId?: number;
    permissions: string[];
  }) {
    // Validate permissions
    if (!this.permissionService.validatePermissions(data.permissions)) {
      throw new Error('Invalid permissions provided');
    }

    // Create role
    return this.roleService.createRole(data);
  }
}
```

### 2. Checking Permissions
```typescript
// usecases/check-permission.usecase.ts
export class CheckPermissionUseCase {
  constructor(
    private roleService: RoleService,
    private membershipService: MembershipService,
    private permissionCheckService: PermissionCheckService
  ) {}

  async execute(userId: number, teamId: number, permission: string): Promise<boolean> {
    // Get user's membership
    const membership = await this.membershipService.getMembership(userId, teamId);
    
    // Check permissions using both custom role and default role
    return this.permissionCheckService.hasPermission(membership, permission);
  }
}
```

## Implementation Steps

1. Create the permission registry with all allowed permissions
2. Add new database models (Role and RolePermission)
3. Update Membership model to include customRole relationship while maintaining existing role
4. Implement permission validation service
5. Implement role management service
6. Implement permission check service with fallback logic
7. Create use cases for role and permission management
8. Add API endpoints for role management
9. Update existing authorization checks to use the new PBAC system
10. Add migration for existing memberships to assign default roles
11. Add tests for new functionality

## Security Considerations

1. Ensure permission validation happens on both client and server side
2. Implement rate limiting for role creation and modification
3. Add audit logging for role and permission changes
4. Implement proper access control for role management endpoints
5. Validate team/organization ownership before allowing role modifications
6. Ensure proper fallback to default role permissions when custom role is not set

## Testing Requirements

1. Unit tests for permission validation
2. Unit tests for role creation and management
3. Integration tests for role assignment
4. E2E tests for permission checks
5. Performance tests for permission checking
6. Security tests for role management endpoints
7. Tests for permission fallback logic

## Migration Plan

1. Create new database tables
2. Add default roles for existing teams/organizations
3. Keep existing role field in Membership model
4. Add customRole field to Membership model
5. Update authorization middleware to use new permission system
6. Deploy changes in stages to minimize disruption






