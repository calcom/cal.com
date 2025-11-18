import jackson from "@calcom/features/ee/sso/lib/jackson";
import {
  canAccessOrganization,
  samlProductID,
  samlTenantID,
  tenantPrefix,
} from "@calcom/features/ee/sso/lib/saml";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TUpdateOIDCInputSchema } from "./updateOIDC.schema";

type UpdateOIDCOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateOIDCInputSchema;
};

export const updateOIDCHandler = async ({ ctx, input }: UpdateOIDCOptions) => {
  const { teamId, clientId, clientSecret, wellKnownUrl } = input;

  const { message, access } = await canAccessOrganization(ctx.user, teamId);

  if (!access) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message,
    });
  }

  const { connectionController } = await jackson();

  try {
    return await connectionController.createOIDCConnection({
      defaultRedirectUrl: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/auth/saml/idp`,
      redirectUrl: JSON.stringify([`${process.env.NEXT_PUBLIC_WEBAPP_URL}/*`]),
      tenant: teamId ? tenantPrefix + teamId : samlTenantID,
      product: samlProductID,
      oidcClientId: clientId,
      oidcClientSecret: clientSecret,
      oidcDiscoveryUrl: wellKnownUrl,
    });
  } catch (err) {
    console.error("Error updating OIDC connection", err);
    throw new TRPCError({ code: "BAD_REQUEST", message: "Updating OIDC Connection failed." });
  }
};
