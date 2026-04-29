import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { prisma } from "@calcom/prisma";
import type { PrismaTransaction } from "@calcom/prisma";
import type { OrganizationSettings, Team } from "@calcom/prisma/client";
import { getOrgUsernameFromEmail } from "./getOrgUsernameFromEmail";

export async function joinAnyChildTeamOnOrgInvite({
  userId,
  org,
  tx,
}: {
  userId: number;
  org: Pick<Team, "id"> & {
    organizationSettings: OrganizationSettings | null;
  };
  tx?: PrismaTransaction;
}) {
  const db = tx || prisma;
  const user = await db.user.findUnique({
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

  const operations = [
    // Simply remove this update when we remove the `organizationId` field from the user table
    db.user.update({
      where: {
        id: userId,
      },
      data: {
        organizationId: org.id,
      },
    }),
    db.profile.upsert({
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
    db.membership.updateMany({
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
    db.membership.updateMany({
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
  ];

  if (tx) {
    await Promise.all(operations);
  } else {
    await prisma.$transaction(operations);
  }
}
