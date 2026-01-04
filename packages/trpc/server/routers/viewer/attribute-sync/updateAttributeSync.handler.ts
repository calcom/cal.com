import { getIntegrationAttributeSyncService } from "@calcom/ee/integration-attribute-sync/di/IntegrationAttributeSyncService.container";

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
  const currentUserOrgId = ctx.user.organizationId;
  const integrationAttributeSyncService = getIntegrationAttributeSyncService();

  // Verify the sync exists and belongs to the user's organization
  const integrationAttributeSync = await integrationAttributeSyncService.getById(input.id);

  if (!integrationAttributeSync) throw new TRPCError({ code: "NOT_FOUND" });

  if (integrationAttributeSync.organizationId !== currentUserOrgId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  await integrationAttributeSyncService.updateIncludeRulesAndMappings(input);
};

export default updateAttributeSyncHandler;
