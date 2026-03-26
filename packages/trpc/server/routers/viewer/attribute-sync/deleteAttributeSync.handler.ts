import { getIntegrationAttributeSyncService } from "@calcom/ee/integration-attribute-sync/di/IntegrationAttributeSyncService.container";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { ZDeleteAttributeSyncSchema } from "./deleteAttributeSync.schema";

type DeleteAttributeSyncOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZDeleteAttributeSyncSchema;
};

const deleteAttributeSyncHandler = async ({ ctx, input }: DeleteAttributeSyncOptions) => {
  const currentUserOrgId = ctx.user.organizationId;
  const integrationAttributeSyncService = getIntegrationAttributeSyncService();

  const integrationAttributeSync = await integrationAttributeSyncService.getById(input.id);

  if (!integrationAttributeSync) throw new TRPCError({ code: "NOT_FOUND" });

  if (integrationAttributeSync.organizationId !== currentUserOrgId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  await integrationAttributeSyncService.deleteById(input.id);
};

export default deleteAttributeSyncHandler;
