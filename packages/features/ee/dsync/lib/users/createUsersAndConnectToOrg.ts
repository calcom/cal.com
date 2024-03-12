import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { getTeamOrThrow } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";

import dSyncUserSelect from "./dSyncUserSelect";

const createUsersAndConnectToOrg = async ({
  emailsToCreate,
  org,
}: {
  emailsToCreate: string[];
  org: Awaited<ReturnType<typeof getTeamOrThrow>>;
}) => {
  const orgId = org.id;

  // As of Mar 2024 Prisma createMany does not support nested creates and returning created records
  await prisma.user.createMany({
    data: emailsToCreate.map((email) => {
      const [emailUser, emailDomain] = email.split("@");
      const username = slugify(`${emailUser}-${emailDomain.split(".")[0]}`);
      return {
        username,
        email,
        // Assume verified since coming from directory
        verified: true,
        invitedTo: orgId,
        organizationId: orgId,
      };
    }),
  });

  const users = await prisma.user.findMany({
    where: {
      email: {
        in: emailsToCreate,
      },
    },
    select: dSyncUserSelect,
  });

  await prisma.membership.createMany({
    data: users.map((user) => ({
      userId: user.id,
      teamId: orgId,
      role: MembershipRole.MEMBER,
    })),
  });

  await prisma.profile.createMany({
    data: users.map((user) => ({
      uid: ProfileRepository.generateProfileUid(),
      userId: user.id,
      // The username is already set when creating the user
      username: user.username!,
      organizationId: orgId,
    })),
  });

  return users;
};

export default createUsersAndConnectToOrg;
