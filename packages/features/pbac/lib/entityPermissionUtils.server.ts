import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRole } from "@calcom/prisma/enums";

export type Entity = {
  userId: number | null;
  teamId: number | null;
};

export async function canEditEntity(entity: Entity, userId: number) {
  if (entity.teamId) {
    const permissionService = new PermissionCheckService();
    const hasEditPermission = await permissionService.checkPermission({
      teamId: entity.teamId,
      userId,
      permission: "routingForm.update",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    return hasEditPermission;
  } else if (entity.userId === userId) return true;

  return false;
}

export async function canAccessEntity(entity: Entity, userId: number) {
  if (entity.teamId) {
    const permissionService = new PermissionCheckService();
    const hasReadPermission = await permissionService.checkPermission({
      teamId: entity.teamId,
      userId,
      permission: "routingForm.read",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER],
    });

    return hasReadPermission;
  } else if (entity.userId === userId) return true;

  return false;
}

export async function canCreateEntity({
  targetTeamId,
  userId,
}: {
  targetTeamId: number | null | undefined;
  userId: number;
}) {
  if (targetTeamId) {
    const permissionService = new PermissionCheckService();
    const hasEditPermission = await permissionService.checkPermission({
      teamId: targetTeamId,
      userId,
      permission: "routingForm.create",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    return hasEditPermission;
  }
  return true;
}

/**
 * Whenever the entity is fetched this clause should be there to ensure that
 * 1. No item that doesn't belong to the user or the team is fetched
 * Having just a reusable where allows it to be used with different types of prisma queries.
 */
export const entityPrismaWhereClause = ({ userId }: { userId: number }) => ({
  OR: [
    { userId: userId },
    {
      team: {
        members: {
          some: {
            userId: userId,
            accepted: true,
          },
        },
      },
    },
  ],
});
