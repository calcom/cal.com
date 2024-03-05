import type { TFunction } from "next-i18next";

import { createAProfileForAnExistingUser } from "@calcom/lib/createAProfileForAnExistingUser";
import prisma from "@calcom/prisma";
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

  await prisma.membership.create({
    data: {
      teamId: org.id,
      userId: user.id,
      role: "MEMBER",
      // Since coming from directory assume it'll be verified
      accepted: true,
    },
  });

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      organizationId: org.id,
    },
  });

  return user;
};

export default inviteExistingUserToOrg;
