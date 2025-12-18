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

  if (input.organizationId !== currentUserOrgId) throw new TRPCError({ code: "UNAUTHORIZED" });

  const integrationAttributeSyncService = getIntegrationAttributeSyncService();
  await integrationAttributeSyncService.updateIncludeRulesAndMappings(input);
};

export default updateAttributeSyncHandler;
