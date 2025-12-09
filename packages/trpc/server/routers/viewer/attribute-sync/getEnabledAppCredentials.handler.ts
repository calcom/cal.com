import { getIntegrationAttributeSyncService } from "@calcom/features/ee/integration-attribute-sync/di/IntegrationAttributeSyncService.container";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { ZGetEnabledAppCredentialsSchema } from "./getEnabledAppCredentials.schema";

type GetEnabledAppCredentialsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZGetEnabledAppCredentialsSchema;
};

const getEnabledAppCredentialsHandler = async ({ ctx }: GetEnabledAppCredentialsOptions) => {
  const org = ctx.user.organization;

  if (!org?.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You need to be part of an organization to use this feature",
    });
  }

  const service = getIntegrationAttributeSyncService();

  return await service.getEnabledAppCredentials({
    organizationId: org.id,
  });
};

export default getEnabledAppCredentialsHandler;
