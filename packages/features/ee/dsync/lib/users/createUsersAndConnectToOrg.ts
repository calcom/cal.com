import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import prisma from "@calcom/prisma";
import type { IdentityProvider } from "@calcom/prisma/enums";
import { CreationSource, MembershipRole } from "@calcom/prisma/enums";

import {
  deriveNameFromOrgUsername,
  getOrgUsernameFromEmail,
} from "../../../../auth/signup/utils/getOrgUsernameFromEmail";
import dSyncUserSelect from "./dSyncUserSelect";

type createUsersAndConnectToOrgPropsType = {
  emailsToCreate: string[];
  identityProvider: IdentityProvider;
  identityProviderId: string | null;
};

export const createUsersAndConnectToOrg = async ({
  createUsersAndConnectToOrgProps,
  org,
}: {
  createUsersAndConnectToOrgProps: createUsersAndConnectToOrgPropsType;
  org: {
    id: number;
    organizationSettings: {
      orgAutoAcceptEmail: string | null;
    } | null;
  };
}) => {
  const { emailsToCreate, identityProvider, identityProviderId } = createUsersAndConnectToOrgProps;

  // As of Mar 2024 Prisma createMany does not support nested creates and returning created records
  await prisma.user.createMany({
    data: emailsToCreate.map((email) => {
      const username = getOrgUsernameFromEmail(email, org.organizationSettings?.orgAutoAcceptEmail ?? null);
      const name = deriveNameFromOrgUsername({ username });
      return {
        username,
        email,
        name,
        // Assume verified since coming from directory
        verified: true,
        emailVerified: new Date(),
        invitedTo: org.id,
        organizationId: org.id,
        identityProvider,
        identityProviderId,
        creationSource: CreationSource.WEBAPP,
      };
    }),
    skipDuplicates: true,
  });

  const users = await prisma.user.findMany({
    where: {
      email: {
        in: emailsToCreate,
      },
    },
    select: dSyncUserSelect,
  });

  // Create profiles for new users
  await ProfileRepository.createManyPromise({
    users,
    organizationId: org.id,
    orgAutoAcceptEmail: org.organizationSettings?.orgAutoAcceptEmail ?? "",
  });

  // Create memberships for new members
  await MembershipRepository.createMany(
    users.map((user) => ({
      userId: user.id,
      teamId: org.id,
      role: MembershipRole.MEMBER,
      accepted: true,
    }))
  );

  return users;
};

export default createUsersAndConnectToOrg;
