import { PrismaApiKeyRepository } from "@calcom/lib/server/repository/PrismaApiKeyRepository";
import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
};

export const listHandler = async ({ ctx: { user, prisma } }: ListOptions) => {
  return new PrismaApiKeyRepository(prisma).findApiKeysFromUserId({ userId: user.id });
};
