import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { getAirtableToken } from "../lib/getAirtableToken";
import { fetchTables } from "../lib/services";

interface TablesHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
  baseId: string;
}

export const tablesHandler = async ({ ctx, baseId }: TablesHandlerOptions) => {
  const token = await getAirtableToken(ctx.user.id);

  const tables = await fetchTables(token.personalAccessToken, baseId);

  return tables;
};
