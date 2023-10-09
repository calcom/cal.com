import type { PrismaClient } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { getAirtableToken } from "../lib/getAirtableToken";
import { fetchBases } from "../lib/services";

interface BasesHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
}

export const basesHandler = async ({ ctx }: BasesHandlerOptions) => {
  const token = await getAirtableToken(ctx.user.id);

  const bases = await fetchBases(token.personalAccessToken);

  return bases.bases;
};
