import jackson from "@calcom/features/ee/sso/lib/jackson";
import { canAccessOrganization } from "@calcom/features/ee/sso/lib/saml";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
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

  const { message, access } = await canAccessOrganization(ctx.user, input.organizationId);

  if (!access) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message,
    });
  }

  // Right now dsync is only available for organizations
  if (!input.organizationId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Organization ID is required",
    });
  }

  const dsyncData = await prisma.dSyncData.findUnique({
    where: {
      organizationId: input.organizationId,
    },
  });

  if (!dsyncData) return null;

  const { data, error } = await dsyncController.directories.get(dsyncData.directoryId);

  if (error) {
    console.error("Error fetching directory sync connection", error);
    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }

  return data;
};

export default getHandler;
