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

  // Find child teams with pending memberships before accepting them
  const pendingChildTeamMemberships = await prisma.membership.findMany({
    where: {
      userId,
      team: {
        parentId: org.id,
      },
      accepted: false,
    },
    select: {
      teamId: true,
    },
  });

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

  // Update event types for the org (likely a no-op since orgs don't have assignAllTeamMembers event types)
  await updateNewTeamMemberEventTypes(userId, org.id);

  // Update event types for each child team that was just accepted
  // This ensures host records are created for event types with assignAllTeamMembers=true
  await Promise.all(
    pendingChildTeamMemberships.map((membership) => updateNewTeamMemberEventTypes(userId, membership.teamId))
  );
}
