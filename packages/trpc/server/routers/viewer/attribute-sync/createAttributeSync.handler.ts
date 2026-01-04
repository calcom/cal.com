import { getIntegrationAttributeSyncService } from "@calcom/ee/integration-attribute-sync/di/IntegrationAttributeSyncService.container";

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

  const integrationAttributeSyncService = getIntegrationAttributeSyncService();

  try {
    return await integrationAttributeSyncService.createAttributeSync(input, org.id);
  } catch (error) {
    if (error instanceof Error && error.message === "Credential not found") {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Credential not found",
      });
    }
    throw error;
  }
};

export default createAttributeSyncHandler;
