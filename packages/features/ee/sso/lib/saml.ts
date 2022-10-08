import { PrismaClient, UserPlan } from "@prisma/client";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import { TRPCError } from "@calcom/trpc/server";

export const samlDatabaseUrl = process.env.SAML_DATABASE_URL || "";
export const samlLoginUrl = WEBAPP_URL;
export const isSAMLLoginEnabled = samlDatabaseUrl.length > 0;
export const samlTenantID = "Cal.com";
export const samlProductID = "Cal.com";
export const hostedCal = WEBAPP_URL === "https://app.cal.com";
export const tenantPrefix = "team-";

const samlAdmins = (process.env.SAML_ADMINS || "").split(",");

export const isSAMLAdmin = (email: string) => {
  for (const admin of samlAdmins) {
    if (admin.toLowerCase() === email.toLowerCase() && admin.toUpperCase() === email.toUpperCase()) {
      return true;
    }
  }

  return false;
};

export const samlTenantProduct = async (prisma: PrismaClient, email: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      invitedTo: true,
    },
  });

  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unauthorized Request",
    });
  }

  if (!user.invitedTo) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Could not find a SAML Identity Provider for your email. Please contact your admin to ensure you have been given access to Cal",
    });
  }

  console.log({
    tenant: tenantPrefix + user.invitedTo,
    product: samlProductID,
  });

  return {
    tenant: tenantPrefix + user.invitedTo,
    product: samlProductID,
  };
};

export const canAccess = (email: string, plan: string, teamsView: boolean) => {
  // SAML SSO disabled for the following conditions
  if ((teamsView && !HOSTED_CAL_FEATURES) || (!teamsView && HOSTED_CAL_FEATURES)) {
    return false;
  }

  if (teamsView) {
    return isSAMLLoginEnabled && plan === UserPlan.PRO;
  } else {
    return isSAMLLoginEnabled && isSAMLAdmin(email);
  }
};
