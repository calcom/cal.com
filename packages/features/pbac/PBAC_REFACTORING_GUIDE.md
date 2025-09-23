# PBAC Refactoring Guide

This guide provides a comprehensive approach to refactoring existing Cal.com handlers to use Permission-Based Access Control (PBAC) instead of traditional role-based access control.

## Overview

PBAC (Permission-Based Access Control) provides fine-grained permission management that goes beyond simple role-based checks. It allows for more flexible and scalable permission systems, especially in enterprise environments.

## Key Components

### 1. Permission Registry
- **Location**: `packages/features/pbac/domain/types/permission-registry.ts`
- **Purpose**: Defines all available permissions and their relationships
- **Key Types**: `Resource`, `CrudAction`, `CustomAction`

### 2. Permission Check Service
- **Location**: `packages/features/pbac/services/permission-check.service.ts`
- **Purpose**: Core service for checking permissions and getting authorized resources
- **Key Methods**:
  - `checkPermission()` - Check single permission
  - `checkPermissions()` - Check multiple permissions
  - `getTeamIdsWithPermission()` - Get team IDs where user has specific permission

### 3. Resource Permissions Helper
- **Location**: `packages/features/pbac/lib/resource-permissions.ts`
- **Purpose**: Higher-level helper functions for common permission patterns
- **Key Functions**:
  - `getSpecificPermissions()` - Get specific action permissions with fallback
  - `getResourcePermissions()` - Get CRUD permissions for a resource

## Refactoring Patterns

### Pattern 1: Team Filtering with PBAC

**Before (Membership-based)**:
```typescript
const teamsToQuery = (
  await prisma.membership.findMany({
    where: {
      userId: ctx.user.id,
      accepted: true,
      // ... other conditions
    },
    select: { teamId: true },
  })
).map((membership) => membership.teamId);
```

**After (PBAC-based)**:
```typescript
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { PermissionMapper } from "@calcom/features/pbac/domain/mappers/PermissionMapper";
import { Resource, CustomAction } from "@calcom/features/pbac/domain/types/permission-registry";

const permissionCheckService = new PermissionCheckService();
let teamsToQuery: number[] = [];

try {
  const permissionString = PermissionMapper.toPermissionString({
    resource: Resource.Team,
    action: CustomAction.ListMembers, // or appropriate action
  });
  
  teamsToQuery = await permissionCheckService.getTeamIdsWithPermission(
    ctx.user.id,
    permissionString
  );
} catch (error) {
  // Fallback to original approach
  teamsToQuery = (
    await prisma.membership.findMany({
      // ... original logic
    })
  ).map((membership) => membership.teamId);
}
```

### Pattern 2: Individual Permission Checks

**Before (Role-based)**:
```typescript
const membership = await prisma.membership.findFirst({
  where: { teamId, userId: ctx.user.id, accepted: true },
});

if (!membership || !allowedRoles.includes(membership.role)) {
  throw new TRPCError({ code: "UNAUTHORIZED" });
}
```

**After (PBAC-based)**:
```typescript
import { getSpecificPermissions } from "@calcom/features/pbac/lib/resource-permissions";

const permissions = await getSpecificPermissions({
  userId: ctx.user.id,
  teamId: teamId,
  resource: Resource.Team,
  userRole: membership.role,
  actions: [CustomAction.ListMembers],
  fallbackRoles: {
    [CustomAction.ListMembers]: {
      roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    },
  },
});

if (!permissions[CustomAction.ListMembers]) {
  throw new TRPCError({ code: "UNAUTHORIZED" });
}
```

## Step-by-Step Refactoring Process

### Step 1: Identify Current Access Control Logic
- Look for direct membership queries
- Identify role-based checks
- Note any privacy or access restrictions

### Step 2: Determine Appropriate Permission
- Check the permission registry for existing permissions
- Use `CustomAction.ListMembers` for member listing
- Use appropriate `CrudAction` for basic operations
- Consider creating new permissions if needed

### Step 3: Choose the Right PBAC Method
- **`getTeamIdsWithPermission()`**: When you need to filter teams by permission
- **`getSpecificPermissions()`**: When you need to check specific actions with fallback
- **`checkPermission()`**: For simple boolean permission checks

### Step 4: Implement with Fallback
- Always include fallback logic for when PBAC is not enabled
- Maintain the original behavior as the fallback
- Use try-catch blocks to handle PBAC failures gracefully

### Step 5: Add Required Imports
```typescript
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { PermissionMapper } from "@calcom/features/pbac/domain/mappers/PermissionMapper";
import { Resource, CustomAction } from "@calcom/features/pbac/domain/types/permission-registry";
// Add getSpecificPermissions if using that pattern
import { getSpecificPermissions } from "@calcom/features/pbac/lib/resource-permissions";
```

## Common Permissions

### Team Permissions
- `team.listMembers` - List team members
- `team.read` - View team details
- `team.update` - Edit team settings
- `team.invite` - Invite team members
- `team.remove` - Remove team members

### Organization Permissions
- `organization.listMembers` - List organization members
- `organization.read` - View organization details
- `organization.manageBilling` - Manage billing

## Best Practices

### 1. Always Include Fallback Logic
```typescript
try {
  // PBAC logic
} catch (error) {
  // Original role-based logic
}
```

### 2. Use Appropriate Permission Granularity
- Don't over-engineer permissions
- Use existing permissions when possible
- Consider permission dependencies

### 3. Maintain Backward Compatibility
- Keep original behavior as fallback
- Don't break existing functionality
- Test both PBAC and non-PBAC scenarios

### 4. Error Handling
- Handle PBAC service failures gracefully
- Log errors appropriately
- Don't expose internal PBAC errors to users

### 5. Performance Considerations
- `getTeamIdsWithPermission()` is more efficient for bulk filtering
- Cache permission results when appropriate
- Avoid unnecessary permission checks

## Testing Strategy

### 1. Unit Tests
- Test both PBAC-enabled and disabled scenarios
- Test fallback behavior
- Test error conditions

### 2. Integration Tests
- Test with real PBAC configurations
- Test permission inheritance (org vs team)
- Test edge cases (no membership, private teams, etc.)

### 3. Manual Testing
- Test with different user roles
- Test in organizations with PBAC enabled/disabled
- Verify UI behavior matches permission checks

## Common Pitfalls

### 1. Not Including Fallback Logic
**Problem**: Code breaks when PBAC is not enabled
**Solution**: Always include try-catch with original logic as fallback

### 2. Using Wrong Permission String Format
**Problem**: Permission checks always fail
**Solution**: Use `PermissionMapper.toPermissionString()` to construct permission strings

### 3. Forgetting Privacy Checks
**Problem**: PBAC bypasses existing privacy logic
**Solution**: Combine PBAC checks with existing privacy/organization checks

### 4. Over-Engineering Permissions
**Problem**: Creating too many granular permissions
**Solution**: Use existing permissions and follow established patterns

## Example Refactoring: listSimpleMembers.handler.ts

This example shows the refactoring of `packages/trpc/server/routers/viewer/teams/listSimpleMembers.handler.ts`:

**Key Changes**:
1. Added PBAC imports
2. Replaced membership query with `getTeamIdsWithPermission()`
3. Used `team.listMembers` permission
4. Maintained fallback to original logic
5. Preserved existing privacy checks

**Permission Used**: `team.listMembers` (CustomAction.ListMembers)
**Method Used**: `getTeamIdsWithPermission()` for efficient team filtering
**Fallback**: Original membership-based query

This refactoring maintains all existing functionality while adding PBAC support for more granular permission control in enterprise environments.

## Verification Checklist

- [ ] PBAC imports added correctly
- [ ] Appropriate permission string used
- [ ] Fallback logic implemented
- [ ] Error handling in place
- [ ] Existing privacy checks preserved
- [ ] Type checking passes
- [ ] Unit tests updated
- [ ] Manual testing completed
- [ ] Performance impact assessed

## Resources

- [Permission Registry](packages/features/pbac/domain/types/permission-registry.ts)
- [Permission Check Service](packages/features/pbac/services/permission-check.service.ts)
- [Resource Permissions Helper](packages/features/pbac/lib/resource-permissions.ts)
- [Example Implementation](packages/trpc/server/routers/viewer/teams/listMembers.handler.ts)
