import type { TFunction } from "next-i18next";

import { createAProfileForAnExistingUser } from "@calcom/lib/createAProfileForAnExistingUser";
import prisma from "@calcom/prisma";
import { sendExistingUserTeamInviteEmails } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";
import type { UserWithMembership } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";

/**
 * This should only be used in a dsync context
 */
const inviteExistingUserToOrg = async ({
  user,
  org,
  translation,
}: {
  user: UserWithMembership;
  org: { id: number; name: string; parent: { name: string } | null };
  translation: TFunction;
}) => {
  await createAProfileForAnExistingUser({
    user,
    organizationId: org.id,
  });

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      organizationId: org.id,
      teams: {
        create: {
          teamId: org.id,
          role: "MEMBER",
          // Since coming from directory assume it'll be verified
          accepted: true,
        },
      },
    },
  });

  await sendExistingUserTeamInviteEmails({
    currentUserName: user.username,
    currentUserTeamName: org.name,
    existingUsersWithMemberships: [user],
    language: translation,
    isOrg: true,
    teamId: org.id,
    isAutoJoin: true,
    currentUserParentTeamName: org?.parent?.name,
  });
};

export default inviteExistingUserToOrg;
