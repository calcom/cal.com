import * as z from "zod";

import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { getAirtableToken } from "../lib/getAirtableToken";

interface TablesHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
  baseId: string;
}

const ZTables = z.object({
  tables: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      fields: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
        })
      ),
    })
  ),
});

const fetchTables = async (key: string, baseId: string) => {
  const req = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
    headers: {
      Authorization: `Bearer ${key}`,
    },
  });

  const res = await req.json();

  return ZTables.parse(res);
};

export const tablesHandler = async ({ ctx, baseId }: TablesHandlerOptions) => {
  const token = await getAirtableToken(ctx.user.id);

  const tables = await fetchTables(token.personalAccessToken, baseId);

  return tables;
};
