# PBAC Refactoring Guide

Quick guide for refactoring Cal.com handlers to use Permission-Based Access Control (PBAC) instead of membership-based queries.

## Core Pattern: Team Filtering with PBAC

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

const permissionCheckService = new PermissionCheckService();
const teamsToQuery = await permissionCheckService.getTeamIdsWithPermission(
  ctx.user.id, 
  "team.listMembers"
);
```

## Key Points

### 1. Use Direct Permission Strings
- Use `"team.listMembers"` directly instead of `PermissionMapper.toPermissionString()`
- Simpler and more readable

### 2. No Fallback Logic Needed
- `getTeamIdsWithPermission()` handles errors internally
- Returns empty array `[]` when user has no permissions (this is legitimate)
- Don't assume empty array means PBAC failure

### 3. Common Team Permissions
- `"team.listMembers"` - List team members
- `"team.read"` - View team details  
- `"team.update"` - Edit team settings
- `"team.invite"` - Invite members
- `"team.remove"` - Remove members

## Step-by-Step Refactoring

1. **Add import**:
   ```typescript
   import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
   ```

2. **Replace membership query**:
   ```typescript
   const permissionCheckService = new PermissionCheckService();
   const teamsToQuery = await permissionCheckService.getTeamIdsWithPermission(
     ctx.user.id, 
     "team.listMembers"
   );
   ```

3. **Keep existing privacy checks** - PBAC doesn't replace organization-level privacy logic

## Example: listSimpleMembers.handler.ts

**What changed**:
- Replaced 17 lines of membership query with 2 lines of PBAC
- Removed unnecessary imports and fallback logic
- Used direct permission string `"team.listMembers"`

**Result**: Cleaner, more maintainable code that respects fine-grained permissions.

## Verification

- Run `yarn type-check:ci --force`
- Ensure existing privacy checks remain intact
- Test with users who have different permission levels
