import jackson from "@calcom/features/ee/sso/lib/jackson";
import {
  canAccessOrganization,
  samlProductID,
  samlTenantID,
  tenantPrefix,
} from "@calcom/features/ee/sso/lib/saml";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TDeleteInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteOptions) => {
  const { connectionController } = await jackson();

  const { teamId } = input;

  const { message, access } = await canAccessOrganization(ctx.user, teamId);

  if (!access) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message,
    });
  }

  try {
    return await connectionController.deleteConnections({
      tenant: teamId ? tenantPrefix + teamId : samlTenantID,
      product: samlProductID,
    });
  } catch (err) {
    console.error("Error deleting SAML connection", err);
    throw new TRPCError({ code: "BAD_REQUEST", message: "Deleting SAML Connection failed." });
  }
};
