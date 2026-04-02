import createUsersAndConnectToOrg from "@calcom/features/ee/dsync/lib/users/createUsersAndConnectToOrg";
import { getOrganizationRepository } from "@calcom/features/ee/organizations/di/OrganizationRepository.container";
import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import type { PrismaClient } from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import jackson from "./jackson";
import { samlProductID, tenantPrefix } from "./saml";

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

export const ssoTenantProduct = async (prisma: PrismaClient, email: string) => {
  const { connectionController } = await jackson();

  let memberships = await getAllAcceptedMemberships({ prisma, email });

  if (!memberships || memberships.length === 0) {
    if (!HOSTED_CAL_FEATURES) throw new ErrorWithCode(ErrorCode.Unauthorized, "no_account_exists");

    const domain = email.split("@")[1];
    const organizationRepository = getOrganizationRepository();
    const organization = await organizationRepository.getVerifiedOrganizationByAutoAcceptEmailDomain(domain);

    if (!organization) throw new ErrorWithCode(ErrorCode.Unauthorized, "no_account_exists");

    const createUsersAndConnectToOrgProps = {
      emailsToCreate: [email],
      identityProvider: IdentityProvider.SAML,
      identityProviderId: email,
    };

    await createUsersAndConnectToOrg({
      createUsersAndConnectToOrgProps,
      org: organization,
    });
    memberships = await getAllAcceptedMemberships({ prisma, email });

    if (!memberships || memberships.length === 0)
      throw new ErrorWithCode(ErrorCode.Unauthorized, "no_account_exists");
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
    throw new ErrorWithCode(
      ErrorCode.BadRequest,
      "Could not find a SSO Identity Provider for your email. Please contact your admin to ensure you have been given access to Cal"
    );
  }

  return {
    tenant: connectionsFound[0][0].tenant,
    product: samlProductID,
  };
};
