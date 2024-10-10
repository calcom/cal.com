import { ApiKeysRepository } from "@calcom/lib/server/repository/apiKeys";

import type { TrpcSessionUser } from "../../../trpc";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listHandler = async ({ ctx }: ListOptions) => {
  return await ApiKeysRepository.getApiKeys({ userId: ctx.user.id });
};
