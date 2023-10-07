import * as z from "zod";

import type { PrismaClient } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { getAirtableToken } from "../lib/getAirtableToken";

interface ProjectsHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
}

const ZBases = z.object({
  bases: z.array(z.object({ id: z.string(), name: z.string() })),
});

const fetchBases = async (key: string) => {
  const req = await fetch("https://api.airtable.com/v0/meta/bases", {
    headers: {
      Authorization: `Bearer ${key}`,
    },
  });

  const res = await req.json();

  return ZBases.parse(res);
};

export const getBasesHandler = async ({ ctx }: ProjectsHandlerOptions) => {
  const token = await getAirtableToken(ctx.user.id);

  const bases = await fetchBases(token.personalAccessToken);

  return bases;
};

export default getBasesHandler;
