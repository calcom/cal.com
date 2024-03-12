import jackson from "@calcom/features/ee/sso/lib/jackson";
import { canAccess, samlProductID, samlTenantID, tenantPrefix } from "@calcom/features/ee/sso/lib/saml";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { ZGetInputSchema } from "./get.schema";

type Options = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZGetInputSchema;
};

// Get directory sync connection for a team
export const getHandler = async ({ ctx, input }: Options) => {
  const { dsyncController } = await jackson();

  const { message, access } = await canAccess(ctx.user, input.organizationId);

  if (!access) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message,
    });
  }

  const tenant = input.organizationId ? `${tenantPrefix}${input.organizationId}` : (samlTenantID as string);

  const { data, error } = await dsyncController.directories.getByTenantAndProduct(tenant, samlProductID);

  if (error) {
    console.error("Error fetching directory sync connection", error);
    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }

  return data;
};

export default getHandler;
