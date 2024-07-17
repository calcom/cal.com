import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import type { IdentityProvider } from "@calcom/prisma/enums";
import { MembershipRole } from "@calcom/prisma/enums";

import dSyncUserSelect from "./dSyncUserSelect";

type createUsersAndConnectToOrgPropsType = {
  emailsToCreate: string[];
  organizationId: number;
  identityProvider: IdentityProvider;
  identityProviderId: string | null;
};

const createUsersAndConnectToOrg = async (
  createUsersAndConnectToOrgProps: createUsersAndConnectToOrgPropsType
) => {
  const { emailsToCreate, organizationId, identityProvider, identityProviderId } =
    createUsersAndConnectToOrgProps;
  // As of Mar 2024 Prisma createMany does not support nested creates and returning created records
  await prisma.user.createMany({
    data: emailsToCreate.map((email) => {
      const [emailUser, emailDomain] = email.split("@");
      const username = slugify(`${emailUser}-${emailDomain.split(".")[0]}`);
      const name = username
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
      return {
        username,
        email,
        name,
        // Assume verified since coming from directory
        verified: true,
        emailVerified: new Date(),
        invitedTo: organizationId,
        organizationId,
        identityProvider,
        identityProviderId,
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
      accepted: true,
      userId: user.id,
      teamId: organizationId,
      role: MembershipRole.MEMBER,
    })),
  });

  await prisma.profile.createMany({
    data: users.map((user) => ({
      uid: ProfileRepository.generateProfileUid(),
      userId: user.id,
      // The username is already set when creating the user
      username: user.username!,
      organizationId,
    })),
  });

  return users;
};

export default createUsersAndConnectToOrg;
