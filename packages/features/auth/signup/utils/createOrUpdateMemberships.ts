import type z from "zod";

import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { prisma } from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { teamMetadataSchema } from "@calcom/prisma/zod-utils";

export const createOrUpdateMemberships = async ({
  teamMetadata,
  user,
  team,
}: {
  user: Pick<User, "id">;
  team: Pick<Team, "id" | "parentId">;
  teamMetadata: z.infer<typeof teamMetadataSchema>;
}) => {
  return await prisma.$transaction(async (tx) => {
    if (teamMetadata?.isOrganization) {
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
      await tx.profile.upsert({
        create: {
          uid: ProfileRepository.generateProfileUid(),
          userId: user.id,
          organizationId: team.id,
          // FIXME: Should properly derive from email
          username: dbUser.username || dbUser.email.split("@")[0],
        },
        update: {
          username: dbUser.username || dbUser.email.split("@")[0],
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
    return { membership, orgMembership };
  });
};
