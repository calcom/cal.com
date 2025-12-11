import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { ZCreateAttributeSyncSchema } from "./createAttributeSync.schema";

type CreateAttributeSyncOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZCreateAttributeSyncSchema;
};

const createAttributeSyncHandler = async ({ ctx, input }: CreateAttributeSyncOptions) => {
  const org = ctx.user.organization;

  if (!org?.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You need to be part of an organization to use this feature",
    });
  }

  // 1. Get credential to determine integration type
  const credential = await prisma.credential.findFirst({
    where: {
      id: input.credentialId,
      teamId: org.id,
    },
    include: {
      app: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!credential) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Credential not found",
    });
  }

  // 2. Create IntegrationAttributeSync with nested AttributeSyncUserRule and FieldMappings
  const attributeSync = await prisma.integrationAttributeSync.create({
    data: {
      organizationId: org.id,
      integration: credential.app?.slug || credential.type,
      credentialId: input.credentialId,
      enabled: input.enabled,
      attributeSyncRules: {
        create: {
          rule: input.rule, // Store as JSON
          syncFieldMappings: {
            create: input.fieldMappings.map((mapping) => ({
              integrationFieldName: mapping.integrationFieldName,
              attributeId: mapping.attributeId,
              enabled: mapping.enabled,
            })),
          },
        },
      },
    },
    include: {
      attributeSyncRules: {
        include: {
          syncFieldMappings: true,
        },
      },
    },
  });

  return attributeSync;
};

export default createAttributeSyncHandler;
