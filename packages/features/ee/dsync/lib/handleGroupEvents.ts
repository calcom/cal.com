import type { DirectorySyncEvent, Group } from "@boxyhq/saml-jackson";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { getTeamOrThrow } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";
import type { UserWithMembership } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";

import createUserAndInviteToOrg from "./users/createUserAndInviteToOrg";
import inviteExistingUserToOrg from "./users/inviteExistingUserToOrg";

const handleGroupEvents = async (event: DirectorySyncEvent, orgId: number) => {
  const { dsyncController } = await jackson();
  // Find the group name associated with the event
  const eventData = event.data as Group;

  const groupNames = await prisma.dSyncTeamGroupMapping.findMany({
    where: {
      directoryId: event.directory_id,
      groupName: eventData.name,
      orgId,
    },
    select: {
      teamId: true,
      groupName: true,
    },
  });

  const org = await getTeamOrThrow(orgId);

  if (!org) {
    throw new Error("Org not found");
  }

  const userIdsToCreateMemberships: number[] = [];

  for (const member of eventData.raw.members) {
    const userInfo = await dsyncController.users.get(member.value);

    if (!userInfo.data) {
      throw new Error("Could not find user within directory");
    }

    let user = await prisma.user.findFirst({
      where: {
        email: userInfo.data?.email,
      },
      select: {
        id: true,
        email: true,
        username: true,
        organizationId: true,
        completedOnboarding: true,
        identityProvider: true,
        profiles: true,
        locale: true,
        password: {
          select: {
            hash: true,
          },
        },
      },
    });

    const translation = await getTranslation(user?.locale || "en", "common");

    if (user && !(user?.organizationId === org.id) && userInfo.data?.active) {
      await inviteExistingUserToOrg({
        user: user as UserWithMembership,
        org,
        translation,
      });
    } else if (!user) {
      user = await createUserAndInviteToOrg({
        userEmail: userInfo.data?.email,
        org,
        translation,
      });
    }

    userIdsToCreateMemberships.push(user.id);
  }

  const membershipCreateData = groupNames.map((group) => {
    return userIdsToCreateMemberships.map((userId) => {
      return {
        userId,
        teamId: group.teamId,
        role: MembershipRole.MEMBER,
        accepted: true,
      };
    });
  });

  await prisma.membership.createMany({
    data: membershipCreateData.flat(2),
    skipDuplicates: true,
  });
};

export default handleGroupEvents;
