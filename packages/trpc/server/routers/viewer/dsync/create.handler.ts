import type { DirectoryType } from "@boxyhq/saml-jackson";
import jackson from "@calcom/features/ee/sso/lib/jackson";
import { canAccessOrganization, samlProductID, samlTenantID } from "@calcom/features/ee/sso/lib/saml";
import prisma from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { ZCreateInputSchema } from "./create.schema";

type Options = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZCreateInputSchema;
};

// Create directory sync connection for a team
export const createHandler = async ({ ctx, input }: Options) => {
  const { organizationId } = input;
  const { dsyncController } = await jackson();

  const { message, access } = await canAccessOrganization(ctx.user, organizationId);

  if (!access) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message,
    });
  }

  const { organization } = ctx.user;

  const tenant = input.organizationId ? `${organization.slug}-${organization.id}` : (samlTenantID as string);

  const { data, error } = await dsyncController.directories.create({
    tenant,
    product: samlProductID,
    name: input.name,
    type: input.provider as DirectoryType,
  });

  if (error || !data) {
    console.error("Error creating directory sync connection", error);
    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }

  await prisma.dSyncData.create({
    data: {
      directoryId: data.id,
      tenant,
      ...(organizationId && { organizationId }),
    },
  });

  return data;
};

export default createHandler;
