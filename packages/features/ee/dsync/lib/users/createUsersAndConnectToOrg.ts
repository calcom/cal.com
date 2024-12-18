import { createOrUpdateMemberships } from "@calcom/features/auth/signup/utils/createOrUpdateMemberships";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import prisma from "@calcom/prisma";
import type { IdentityProvider } from "@calcom/prisma/enums";

import { getOrgUsernameFromEmail } from "../../../../auth/signup/utils/getOrgUsernameFromEmail";
import dSyncUserSelect from "./dSyncUserSelect";

type createUsersAndConnectToOrgPropsType = {
  emailsToCreate: string[];
  organizationId: number;
  identityProvider: IdentityProvider;
  identityProviderId: string | null;
};

export const createUsersAndConnectToOrgWithOrgParam = async ({
  createUsersAndConnectToOrgProps,
  org,
}: {
  createUsersAndConnectToOrgProps: createUsersAndConnectToOrgPropsType;
  org: {
    organizationSettings: {
      orgAutoAcceptEmail: string | null;
    } | null;
  };
}) => {
  const { emailsToCreate, organizationId, identityProvider, identityProviderId } =
    createUsersAndConnectToOrgProps;

  // As of Mar 2024 Prisma createMany does not support nested creates and returning created records
  await prisma.user.createMany({
    data: emailsToCreate.map((email) => {
      const username = getOrgUsernameFromEmail(email, org.organizationSettings?.orgAutoAcceptEmail ?? null);
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
  // Assign created users to organization
  for (const user of users) {
    await createOrUpdateMemberships({
      user,
      team: {
        id: organizationId,
        isOrganization: true,
        parentId: null, // orgs don't have a parentId
      },
    });
  }
  return users;
};

const createUsersAndConnectToOrg = async (
  createUsersAndConnectToOrgProps: createUsersAndConnectToOrgPropsType
) => {
  const org = await OrganizationRepository.findByIdIncludeOrganizationSettings({
    id: createUsersAndConnectToOrgProps.organizationId,
  });
  if (!org) {
    throw new Error("Org not found");
  }
  return createUsersAndConnectToOrgWithOrgParam({ createUsersAndConnectToOrgProps, org });
};

export default createUsersAndConnectToOrg;
