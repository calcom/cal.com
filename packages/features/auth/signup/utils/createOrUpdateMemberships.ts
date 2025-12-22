import { updateNewTeamMemberEventTypes } from "@calcom/features/ee/teams/lib/queries";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { prisma } from "@calcom/prisma";
import type { Team, User, OrganizationSettings } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

import { getOrgUsernameFromEmail } from "./getOrgUsernameFromEmail";

export const createOrUpdateMemberships = async ({
  user,
  team,
}: {
  user: Pick<User, "id">;
  team: Pick<Team, "id" | "parentId" | "isOrganization"> & {
    organizationSettings?: Pick<OrganizationSettings, "orgAutoAcceptEmail"> | null;
  };
}) => {
  return await prisma.$transaction(async (tx) => {
    if (team.isOrganization) {
      const dbUser = await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          organizationId: team.id,
        },
        select: {
          username: true,
          email: true,
        },
      });

      // Ideally dbUser.username should never be null, but just in case.
      // This method being called only during signup means that dbUser.username should be the correct org username
      const orgUsername =
        dbUser.username ||
        getOrgUsernameFromEmail(dbUser.email, team.organizationSettings?.orgAutoAcceptEmail ?? null);
      await tx.profile.upsert({
        create: {
          uid: ProfileRepository.generateProfileUid(),
          userId: user.id,
          organizationId: team.id,
          username: orgUsername,
        },
        update: {
          username: orgUsername,
        },
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: team.id,
          },
        },
      });
    }
    const membership = await tx.membership.upsert({
      where: {
        userId_teamId: { userId: user.id, teamId: team.id },
      },
      update: {
        accepted: true,
      },
      create: {
        userId: user.id,
        teamId: team.id,
        role: MembershipRole.MEMBER,
        accepted: true,
      },
    });
    const orgMembership = null;
    if (team.parentId) {
      await tx.membership.upsert({
        where: {
          userId_teamId: { userId: user.id, teamId: team.parentId },
        },
        update: {
          accepted: true,
        },
        create: {
          userId: user.id,
          teamId: team.parentId,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });
    }
    await updateNewTeamMemberEventTypes(user.id, team.id);
    return { membership, orgMembership };
  });
};
