import type { TFunction } from "i18next";

import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

interface UserWithBillingAccess {
  id: number;
  name: string | null;
  email: string;
  t: TFunction;
}

interface TeamWithBillingAdmins {
  id: number;
  name: string;
  adminAndOwners: UserWithBillingAccess[];
}

interface GetUserAndTeamResult {
  user?: UserWithBillingAccess;
  team?: TeamWithBillingAdmins;
}

export async function getUserAndTeamWithBillingPermission({
  userId,
  teamId,
  prismaClient,
}: {
  userId?: number | null;
  teamId?: number | null;
  prismaClient: PrismaClient;
}): Promise<GetUserAndTeamResult> {
  const result: GetUserAndTeamResult = {};

  if (teamId) {
    const teamRepository = new TeamRepository(prismaClient);
    const team = await teamRepository.findTeamWithAdminMembers({ teamId });

    if (!team) {
      return result;
    }

    const permissionService = new PermissionCheckService();
    const permission = team.isOrganization ? "organization.manageBilling" : "team.manageBilling";
    const usersWithBillingAccess: UserWithBillingAccess[] = [];

    for (const member of team.members) {
      const hasPermission = await permissionService.checkPermission({
        userId: member.user.id,
        teamId,
        permission,
        fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      });

      if (hasPermission) {
        usersWithBillingAccess.push({
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          t: await getTranslation(member.user.locale ?? "en", "common"),
        });
      }
    }

    result.team = {
      id: team.id,
      name: team.name ?? "",
      adminAndOwners: usersWithBillingAccess,
    };
  } else if (userId) {
    const userRepository = new UserRepository(prismaClient);
    const userRecord = await userRepository.findById({ id: userId });

    if (userRecord) {
      result.user = {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        t: await getTranslation(userRecord.locale ?? "en", "common"),
      };
    }
  }

  return result;
}
