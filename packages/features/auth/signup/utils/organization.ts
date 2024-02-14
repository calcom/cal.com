import { updateNewTeamMemberEventTypes } from "@calcom/lib/server/queries";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { prisma } from "@calcom/prisma";
import type { Team } from "@calcom/prisma/client";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { getOrgUsernameFromEmail } from "./getOrgUsernameFromEmail";

export async function joinAnyChildTeamOnOrgInvite({ userId, org }: { userId: number; org: Team }) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!user) {
    throw new Error("User not found");
  }

  const orgMetadata = teamMetadataSchema.parse(org.metadata);

  const orgUsername =
    user.username || getOrgUsernameFromEmail(user.email, orgMetadata?.orgAutoAcceptEmail ?? null);

  await prisma.$transaction([
    // Simply remove this update when we remove the `organizationId` field from the user table
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
}
