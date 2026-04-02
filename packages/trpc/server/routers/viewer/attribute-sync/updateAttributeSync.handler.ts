import { getIntegrationAttributeSyncService } from "@calcom/ee/integration-attribute-sync/di/IntegrationAttributeSyncService.container";
import {
  DuplicateAttributeAcrossSyncsError,
  DuplicateAttributeWithinSyncError,
} from "@calcom/ee/integration-attribute-sync/services/IntegrationAttributeSyncService";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { ZUpdateAttributeSyncSchema } from "./updateAttributeSync.schema";

type UpdateAttributeSyncOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZUpdateAttributeSyncSchema;
};

const updateAttributeSyncHandler = async ({ ctx, input }: UpdateAttributeSyncOptions) => {
  const org = ctx.user.organization;

  if (!org?.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You need to be part of an organization to use this feature",
    });
  }

  const integrationAttributeSyncService = getIntegrationAttributeSyncService();

  // Verify the sync exists and belongs to the user's organization
  const integrationAttributeSync = await integrationAttributeSyncService.getById(input.id);

  if (!integrationAttributeSync) throw new TRPCError({ code: "NOT_FOUND" });

  if (integrationAttributeSync.organizationId !== org.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  try {
    await integrationAttributeSyncService.updateIncludeRulesAndMappings(input);
  } catch (error) {
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
          "This attribute is already mapped in another sync. Each attribute can only be synced from one source.",
      });
    }
    throw error;
  }
};

export default updateAttributeSyncHandler;
