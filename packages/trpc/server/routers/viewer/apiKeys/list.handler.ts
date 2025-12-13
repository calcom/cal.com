import { getApiKeyRepository } from "@calcom/features/di/containers/RepositoryContainer";

import type { TrpcSessionUser } from "../../../types";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listHandler = async ({ ctx: { user } }: ListOptions) => {
  const apiKeyRepo = getApiKeyRepository();
  return apiKeyRepo.findApiKeysFromUserId({ userId: user.id });
};
