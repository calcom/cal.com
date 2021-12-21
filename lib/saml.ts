import { PrismaClient } from "@prisma/client";

import { BASE_URL } from "@lib/config/constants";

import { TRPCError } from "@trpc/server";

export const samlDatabaseUrl = process.env.SAML_DATABASE_URL || "";
export const samlLoginUrl = BASE_URL;

export const isSAMLLoginEnabled = samlDatabaseUrl.length > 0;

export const samlTenantID = "Cal.com";
export const samlProductID = "Cal.com";

const samlAdmins = (process.env.SAML_ADMINS || "").split(",");
export const hostedCal = BASE_URL === "https://app.cal.com";
export const tenantPrefix = "team-";

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

  return {
    tenant: tenantPrefix + user.invitedTo,
    product: samlProductID,
  };
};
