import { OrganizationRepository } from "@calcom/features/ee/organizations/repositories/OrganizationRepository";
import { updateNewTeamMemberEventTypes } from "@calcom/features/ee/teams/lib/queries";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { prisma } from "@calcom/prisma";
import type { Team, OrganizationSettings } from "@calcom/prisma/client";

import { getOrgUsernameFromEmail } from "./getOrgUsernameFromEmail";

export async function joinAnyChildTeamOnOrgInvite({
  userId,
  org,
}: {
  userId: number;
  org: Pick<Team, "id"> & {
    organizationSettings: OrganizationSettings | null;
  };
}) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!user) {
    throw new Error("User not found");
  }

  const orgUsername =
    user.username ||
    getOrgUsernameFromEmail(user.email, org.organizationSettings?.orgAutoAcceptEmail ?? null);

  const organizationRepository = new OrganizationRepository({ prismaClient: prisma });
  const pendingChildTeamMemberships = await organizationRepository.findPendingChildTeamMemberships({
    orgId: org.id,
    userId,
  });

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        organizationId: org.id,
      },
    }),
    prisma.profile.upsert({
      create: {
        uid: ProfileRepository.generateProfileUid(),
        userId: userId,
        organizationId: org.id,
        username: orgUsername,
      },
      update: {
        username: orgUsername,
      },
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: org.id,
        },
      },
    }),
    prisma.membership.updateMany({
      where: {
        userId,
        team: {
          id: org.id,
        },
        accepted: false,
      },
      data: {
        accepted: true,
      },
    }),
    prisma.membership.updateMany({
      where: {
        userId,
        team: {
          parentId: org.id,
        },
        accepted: false,
      },
      data: {
        accepted: true,
      },
    }),
  ]);

  await updateNewTeamMemberEventTypes(userId, org.id);

  await Promise.all(
    pendingChildTeamMemberships.map((membership) => updateNewTeamMemberEventTypes(userId, membership.teamId))
  );
}
