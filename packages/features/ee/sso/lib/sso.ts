import createUsersAndConnectToOrg from "@calcom/features/ee/dsync/lib/users/createUsersAndConnectToOrg";
import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import type { PrismaClient } from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import { TRPCError } from "@calcom/trpc/server";

import jackson from "./jackson";
import { tenantPrefix, samlProductID } from "./saml";

const getAllAcceptedMemberships = async ({ prisma, email }: { prisma: PrismaClient; email: string }) => {
  return await prisma.membership.findMany({
    select: {
      teamId: true,
    },
    where: {
      accepted: true,
      user: {
        email,
      },
    },
  });
};

const getVerifiedOrganizationByAutoAcceptEmailDomain = async ({
  prisma,
  domain,
}: {
  prisma: PrismaClient;
  domain: string;
}) => {
  return await prisma.team.findFirst({
    where: {
      organizationSettings: {
        isOrganizationVerified: true,
        orgAutoAcceptEmail: domain,
      },
    },
    select: {
      id: true,
    },
  });
};

export const ssoTenantProduct = async (prisma: PrismaClient, email: string) => {
  const { connectionController } = await jackson();

  let memberships = await getAllAcceptedMemberships({ prisma, email });

  if (!memberships || memberships.length === 0) {
    if (!HOSTED_CAL_FEATURES)
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "no_account_exists",
      });

    const domain = email.split("@")[1];
    const organization = await getVerifiedOrganizationByAutoAcceptEmailDomain({ prisma, domain });

    if (!organization)
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "no_account_exists",
      });

    const organizationId = organization.id;
    const createUsersAndConnectToOrgProps = {
      emailsToCreate: [email],
      organizationId,
      identityProvider: IdentityProvider.SAML,
      identityProviderId: email,
    };

    await createUsersAndConnectToOrg(createUsersAndConnectToOrgProps);
    memberships = await getAllAcceptedMemberships({ prisma, email });

    if (!memberships || memberships.length === 0)
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "no_account_exists",
      });
  }

  // Check SSO connections for each team user is a member of
  // We'll use the first one we find
  const promises = memberships.map(({ teamId }) =>
    connectionController.getConnections({
      tenant: `${tenantPrefix}${teamId}`,
      product: samlProductID,
    })
  );

  const connectionResults = await Promise.allSettled(promises);

  const connectionsFound = connectionResults
    .filter((result) => result.status === "fulfilled")
    .map((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((connections) => connections.length > 0);

  if (connectionsFound.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Could not find a SSO Identity Provider for your email. Please contact your admin to ensure you have been given access to Cal",
    });
  }

  return {
    tenant: connectionsFound[0][0].tenant,
    product: samlProductID,
  };
};
