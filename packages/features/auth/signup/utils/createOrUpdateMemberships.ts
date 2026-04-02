import { updateNewTeamMemberEventTypes } from "@calcom/features/ee/teams/lib/queries";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { prisma } from "@calcom/prisma";
import type { OrganizationSettings, Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { getOrgUsernameFromEmail } from "./getOrgUsernameFromEmail";

type ParentTeamData = {
  id: number;
  organizationSettings?: Pick<OrganizationSettings, "orgAutoAcceptEmail"> | null;
};

export const createOrUpdateMemberships = async ({
  user,
  team,
}: {
  user: Pick<User, "id">;
  team: Pick<Team, "id" | "parentId" | "isOrganization"> & {
    organizationSettings?: Pick<OrganizationSettings, "orgAutoAcceptEmail"> | null;
    parent?: ParentTeamData | null;
  };
}) => {
  return await prisma.$transaction(async (tx) => {
    // Determine the organization context - either the team itself (if it's an org) or its parent
    const organizationId = team.isOrganization ? team.id : (team.parent?.id ?? null);
    const orgSettings = team.isOrganization
      ? team.organizationSettings
      : (team.parent?.organizationSettings ?? null);

    // Create profile if user is joining an organization context (either directly or via sub-team)
    if (organizationId) {
      const dbUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { username: true, email: true },
      });

      if (dbUser) {
        // Ideally dbUser.username should never be null, but just in case.
        // This method being called only during signup means that dbUser.username should be the correct org username
        const orgUsername =
          dbUser.username || getOrgUsernameFromEmail(dbUser.email, orgSettings?.orgAutoAcceptEmail ?? null);

        await tx.profile.upsert({
          create: {
            uid: ProfileRepository.generateProfileUid(),
            userId: user.id,
            organizationId: organizationId,
            username: orgUsername,
          },
          update: {
            username: orgUsername,
          },
          where: {
            userId_organizationId: {
              userId: user.id,
              organizationId: organizationId,
            },
          },
        });
      }
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
