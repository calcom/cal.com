import { createOrUpdateMemberships } from "@calcom/features/auth/signup/utils/createOrUpdateMemberships";
import prisma from "@calcom/prisma";
import type { IdentityProvider } from "@calcom/prisma/enums";
import { CreationSource } from "@calcom/prisma/enums";

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
  });

  const users = await prisma.user.findMany({
    where: {
      email: {
        in: emailsToCreate,
      },
    },
    select: dSyncUserSelect,
  });
  // Assign created users to organization
  for (const user of users) {
    await createOrUpdateMemberships({
      user,
      team: {
        id: org.id,
        isOrganization: true,
        parentId: null, // orgs don't have a parentId
      },
    });
  }
  return users;
};

export default createUsersAndConnectToOrg;
