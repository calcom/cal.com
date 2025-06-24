import { ApiKeyRepository } from "@calcom/lib/server/repository/apiKey";

import type { TrpcSessionUser } from "../../../types";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listHandler = async ({ ctx }: ListOptions) => {
  return ApiKeyRepository.findApiKeysFromUserId({ userId: ctx.user.id });
};
