import { getIntegrationAttributeSyncService } from "@calcom/features/ee/integration-attribute-sync/di/IntegrationAttributeSyncService.container";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { ZGetAllAttributeSyncsSchema } from "./getAllAttributeSyncs.schema";

type GetAllAttributeSyncsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZGetAllAttributeSyncsSchema;
};

const getAllAttributeSyncsHandler = async ({ ctx }: GetAllAttributeSyncsOptions) => {
  const org = ctx.user.organization;

  if (!org?.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You need to be part of an organization to use this feature",
    });
  }

  const service = getIntegrationAttributeSyncService();

  return await service.getAllIntegrationAttributeSyncs(org.id);
};

export default getAllAttributeSyncsHandler;
