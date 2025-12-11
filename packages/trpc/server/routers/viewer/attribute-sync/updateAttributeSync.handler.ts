import { getIntegrationAttributeSyncService } from "@calcom/ee/integration-attribute-sync/di/IntegrationAttributeSyncService.container";

import type { TrpcSessionUser } from "../../../types";
import { ZUpdateAttributeSyncSchema } from "./updateAttributeSync.schema";

type UpdateAttributeSyncOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZUpdateAttributeSyncSchema;
};

const updateAttributeSyncHandler = async ({ input }: UpdateAttributeSyncOptions) => {
  const integrationAttributeSyncService = getIntegrationAttributeSyncService();
  await integrationAttributeSyncService.updateIncludeRulesAndMappings(input);
};

export default updateAttributeSyncHandler;
