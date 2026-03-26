import { getIntegrationAttributeSyncService } from "@calcom/ee/integration-attribute-sync/di/IntegrationAttributeSyncService.container";
import {
  CredentialNotFoundError,
  DuplicateAttributeWithinSyncError,
  DuplicateAttributeAcrossSyncsError,
} from "@calcom/ee/integration-attribute-sync/services/IntegrationAttributeSyncService";

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
    if (error instanceof CredentialNotFoundError) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Credential not found",
      });
    }
    if (error instanceof DuplicateAttributeWithinSyncError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Each attribute can only be mapped once per sync. Please remove duplicate attribute mappings.",
      });
    }
    if (error instanceof DuplicateAttributeAcrossSyncsError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "An attribute is already mapped in another sync. Each attribute can only be synced from one source.",
      });
    }
    throw error;
  }
};

export default createAttributeSyncHandler;
