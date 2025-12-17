import { getIntegrationAttributeSyncService } from "@calcom/ee/integration-attribute-sync/di/IntegrationAttributeSyncService.container";

import type { TrpcSessionUser } from "../../../types";
import type { ZDeleteAttributeSyncSchema } from "./deleteAttributeSync.schema";

type DeleteAttributeSyncOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZDeleteAttributeSyncSchema;
};

const deleteAttributeSyncHandler = async ({ input }: DeleteAttributeSyncOptions) => {
  const integrationAttributeSyncService = getIntegrationAttributeSyncService();
  await integrationAttributeSyncService.deleteById(input.id);
};

export default deleteAttributeSyncHandler;
