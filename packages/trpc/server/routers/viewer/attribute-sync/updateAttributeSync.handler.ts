import { getIntegrationAttributeSyncService } from "@calcom/ee/integration-attribute-sync/di/IntegrationAttributeSyncService.container";
import {
  AttributeSyncIntegrations,
  type ISyncFormData,
} from "@calcom/ee/integration-attribute-sync/repositories/IIntegrationAttributeSyncRepository";
import {
  DuplicateAttributeWithinSyncError,
  DuplicateAttributeAcrossSyncsError,
} from "@calcom/ee/integration-attribute-sync/services/IntegrationAttributeSyncService";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import { ZUpdateAttributeSyncSchema } from "./updateAttributeSync.schema";

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

  // Never trust user-supplied organizationId — override with authenticated user's org
  const safeInput: ISyncFormData = { ...input, organizationId: org.id };

  // Validate credential belongs to the user's organization and derive integration type
  if (input.credentialId !== undefined) {
    const credential = await integrationAttributeSyncService.validateCredentialBelongsToOrg(
      input.credentialId,
      org.id
    );
    if (!credential) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Credential not found" });
    }

    const integrationValue = credential.app?.slug || credential.type;
    if (!Object.values(AttributeSyncIntegrations).includes(integrationValue as AttributeSyncIntegrations)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Unsupported integration type: ${integrationValue}` });
    }

    safeInput.integration = integrationValue as AttributeSyncIntegrations;
  }

  try {
    await integrationAttributeSyncService.updateIncludeRulesAndMappings(safeInput);
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
