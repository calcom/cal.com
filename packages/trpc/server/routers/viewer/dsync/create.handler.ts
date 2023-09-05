import type { DirectoryType } from "@boxyhq/saml-jackson";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import { canAccess, samlProductID, samlTenantID } from "@calcom/features/ee/sso/lib/saml";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { ZCreateInputSchema } from "./create.schema";

type Options = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZCreateInputSchema;
};

// Create directory sync connection for a team
export const createHandler = async ({ ctx, input }: Options) => {
  const { dsyncController } = await jackson();

  const { message, access } = await canAccess(ctx.user, input.teamId);

  if (!access) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message,
    });
  }

  const { data, error } = await dsyncController.directories.create({
    tenant: samlTenantID,
    product: samlProductID,
    name: input.name,
    type: input.provider as DirectoryType,
  });

  if (error) {
    console.error("Error creating directory sync connection", error);
    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }

  return data;
};
