# Cal.com Permission Documentation

This document maps existing role-based permission checks to the new PBAC (Permission-Based Access Control) system's permission strings in the format `resource.action`.

## Permissions by Resource

### Team Permissions

| Permission String | Description | File Path | Line |
|------------------|-------------|-----------|------|
| team.create | Create teams | [packages/trpc/server/routers/viewer/teams/create.handler.ts](packages/trpc/server/routers/viewer/teams/create.handler.ts) | 55-57 |
| team.update | Update team settings | [packages/trpc/server/routers/viewer/teams/update.handler.ts](packages/trpc/server/routers/viewer/teams/update.handler.ts) | 18 |
| team.changeMemberRole | Change role of team members | [packages/trpc/server/routers/viewer/teams/changeMemberRole.handler.ts](packages/trpc/server/routers/viewer/teams/changeMemberRole.handler.ts) | 18-21 |
| team.remove | Remove members from team | [packages/trpc/server/routers/viewer/teams/removeMember.handler.ts](packages/trpc/server/routers/viewer/teams/removeMember.handler.ts) | 35-36, 51-55 |
| team.invite | Invite members to team | [packages/trpc/server/routers/viewer/teams/invite.handler.ts](packages/trpc/server/routers/viewer/teams/invite.handler.ts) | - |

### Event Type Permissions

| Permission String | Description | File Path | Line |
|------------------|-------------|-----------|------|
| eventType.create | Create event types | [packages/trpc/server/routers/viewer/eventTypes/create.handler.ts](packages/trpc/server/routers/viewer/eventTypes/create.handler.ts) | - |
| eventType.update | Update event types | [packages/trpc/server/routers/viewer/eventTypes/update.handler.ts](packages/trpc/server/routers/viewer/eventTypes/update.handler.ts) | 162-164 |
| eventType.delete | Delete event types | [packages/trpc/server/routers/viewer/eventTypes/delete.handler.ts](packages/trpc/server/routers/viewer/eventTypes/delete.handler.ts) | 13-31 |

### Booking Permissions

| Permission String | Description | File Path | Line |
|------------------|-------------|-----------|------|
| booking.read | Read booking details | [packages/trpc/server/routers/viewer/bookings/get.handler.ts](packages/trpc/server/routers/viewer/bookings/get.handler.ts) | 95-107, 132-134 |
| booking.readTeamBookings | Read team bookings | [packages/trpc/server/routers/viewer/bookings/get.handler.ts](packages/trpc/server/routers/viewer/bookings/get.handler.ts) | 240-252 |
| booking.readOrgBookings | Read organization bookings | [packages/trpc/server/routers/viewer/bookings/get.handler.ts](packages/trpc/server/routers/viewer/bookings/get.handler.ts) | 240-252 |

### Organization Permissions

| Permission String | Description | File Path | Line |
|------------------|-------------|-----------|------|
| organization.read | Read organization details | [packages/trpc/server/routers/viewer/organizations/get.handler.ts](packages/trpc/server/routers/viewer/organizations/get.handler.ts) | - |
| organization.listMembers | List organization members | [packages/trpc/server/routers/viewer/organizations/listMembers.handler.ts](packages/trpc/server/routers/viewer/organizations/listMembers.handler.ts) | 68-76 |
| organization.create | Create organization | [packages/trpc/server/routers/viewer/organizations/create.handler.ts](packages/trpc/server/routers/viewer/organizations/create.handler.ts) | - |

### API Key Permissions

| Permission String | Description | File Path | Line |
|------------------|-------------|-----------|------|
| apiKey.create | Create API keys | [packages/trpc/server/routers/viewer/apiKeys/create.handler.ts](packages/trpc/server/routers/viewer/apiKeys/create.handler.ts) | 25-26 |
| apiKey.findKeyOfType | Find API keys by type | [packages/trpc/server/routers/viewer/apiKeys/findKeyOfType.handler.ts](packages/trpc/server/routers/viewer/apiKeys/findKeyOfType.handler.ts) | 18-19 |

## Helper Functions and Utilities

The following helper functions are commonly used for permission checks:

| Function | Description | File Path |
|----------|-------------|-----------|
| isTeamAdmin | Checks if user is admin or owner of a team | [packages/lib/server/queries/teams/index.ts](packages/lib/server/queries/teams/index.ts#L385-L405) |
| isTeamOwner | Checks if user is owner of a team | [packages/lib/server/queries/teams/index.ts](packages/lib/server/queries/teams/index.ts#L407-L416) |
| isTeamMember | Checks if user is a member of a team | [packages/lib/server/queries/teams/index.ts](packages/lib/server/queries/teams/index.ts#L418-L426) |
| canEditEntity | Checks if user can edit an entity | [packages/lib/entityPermissionUtils.ts](packages/lib/entityPermissionUtils.ts#L13-L22) |
| canAccessEntity | Checks if user can access an entity | [packages/lib/entityPermissionUtils.ts](packages/lib/entityPermissionUtils.ts#L24-L34) |
| getEntityPermissionLevel | Gets permission level for an entity | [packages/lib/entityPermissionUtils.ts](packages/lib/entityPermissionUtils.ts#L36-L73) |
| canCreateEntity | Checks if user can create an entity | [packages/lib/entityPermissionUtils.ts](packages/lib/entityPermissionUtils.ts#L102-L115) |
| withRoleCanCreateEntity | Checks if role allows entity creation | [packages/lib/entityPermissionUtils.ts](packages/lib/entityPermissionUtils.ts#L119-L121) |

## Permission Level Enums

The codebase uses several enums to define permission levels:

### MembershipRole Enum

```typescript
enum MembershipRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER"
}
```

### Entity Permission Level Enum

```typescript
enum ENTITY_PERMISSION_LEVEL {
  NONE,
  USER_ONLY_WRITE,
  TEAM_READ_ONLY,
  TEAM_WRITE
}
```

## Common Permission Patterns

1. **Team Admin/Owner Check**: Many operations require the user to be a team admin or owner.
   ```typescript
   if (!(await isTeamAdmin(ctx.user?.id, input.teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });
   ```

2. **Team Owner Check**: Some operations (like changing an owner's role) require the user to be a team owner.
   ```typescript
   if (input.role === MembershipRole.OWNER && !(await isTeamOwner(ctx.user?.id, input.teamId)))
     throw new TRPCError({ code: "UNAUTHORIZED" });
   ```

3. **Organization Admin Check**: Operations within an organization require the user to be an organization admin.
   ```typescript
   if (user.profile?.organizationId && !user.organization.isOrgAdmin) {
     throw new TRPCError({ code: "FORBIDDEN", message: "org_admins_can_create_new_teams" });
   }
   ```

4. **Entity Permission Check**: Entity operations use permission level checks.
   ```typescript
   const permissionLevel = await getEntityPermissionLevel(entity, userId);
   return permissionLevel === ENTITY_PERMISSION_LEVEL.TEAM_WRITE || 
          permissionLevel === ENTITY_PERMISSION_LEVEL.USER_ONLY_WRITE;
   ```

5. **Booking Access Control**: Complex permission checks for retrieving bookings based on user roles and team/organization membership.
   ```typescript
   const membershipIdsWhereUserIsAdminOwner = (
     await prisma.membership.findMany({
       where: {
         userId: user.id,
         role: {
           in: ["ADMIN", "OWNER"],
         },
       },
       select: {
         id: true,
       },
     })
   ).map((membership) => membership.id);
   ```

## Migration to PBAC

When migrating to the new PBAC system, these existing role-based checks should be replaced with permission string checks using the `permissionMatches` function:

```typescript
import { permissionMatches } from "@calcom/features/pbac/types/permission-registry";

// Instead of:
if (!(await isTeamAdmin(ctx.user?.id, input.teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });

// Use:
if (!permissionMatches("team.update", userPermissions)) throw new TRPCError({ code: "UNAUTHORIZED" });
```

## Permission String Alternatives for Helper Functions

The following table provides permission string alternatives for common helper functions:

| Helper Function | Permission String Alternative | Description |
|-----------------|-------------------------------|-------------|
| isTeamAdmin | `team.*` | Grants all team permissions |
| isTeamAdmin | `team.update` | Update team settings |
| isTeamAdmin | `team.invite` | Invite team members |
| isTeamAdmin | `team.remove` | Remove team members |
| isTeamOwner | `team.changeMemberRole` | Change role of team members |
| isTeamOwner | `team.delete` | Delete team |
| isTeamMember | `team.read` | Read-only access to team |

## Entity Permission Functions and Resources

The following functions are used to check permissions for entities with userId and teamId properties:

| Function | Description | Permission String Alternative |
|----------|-------------|-------------------------------|
| canEditEntity | Checks if user can edit an entity | `{resource}.update` |
| canAccessEntity | Checks if user can access an entity | `{resource}.read` |
| getEntityPermissionLevel | Gets permission level for an entity | N/A - Implementation detail |
| canCreateEntity | Checks if user can create an entity | `{resource}.create` |

### Resources Used with Entity Permission Functions

| Resource | canEditEntity Usage | canAccessEntity Usage | Permission String |
|----------|-------------------|---------------------|------------------|
| routingForm | [packages/app-store/routing-forms/trpc/forms.handler.ts](packages/app-store/routing-forms/trpc/forms.handler.ts#L72) | [packages/app-store/routing-forms/trpc/getResponseWithFormFields.handler.ts](packages/app-store/routing-forms/trpc/getResponseWithFormFields.handler.ts#L78) | `routingForm.update`, `routingForm.read` |
| routingForm | [packages/app-store/routing-forms/trpc/formMutation.handler.ts](packages/app-store/routing-forms/trpc/formMutation.handler.ts#L315) | | `routingForm.update` |
| routingForm | [packages/app-store/routing-forms/api/responses/[formId].ts](packages/app-store/routing-forms/api/responses/[formId].ts#L96) | | `routingForm.update` |

These functions can be used with any entity that has userId and teamId properties. When migrating to PBAC, replace these checks with appropriate permission string checks:

```typescript
// Instead of:
if (!(await canEditEntity(form, user.id))) throw new TRPCError({ code: "UNAUTHORIZED" });

// Use:
if (!permissionMatches("routingForm.update", userPermissions)) throw new TRPCError({ code: "UNAUTHORIZED" });
```

This allows for more granular permission control and the creation of custom roles with specific permissions.
