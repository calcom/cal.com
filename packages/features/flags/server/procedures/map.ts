import type { NextApiRequest } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import publicProcedure from "@calcom/trpc/server/procedures/publicProcedure";

import { getFeatureFlagMap } from "../utils";

export const map = publicProcedure.query(async ({ ctx }) => {
  const { prisma } = ctx;
  const session = await getServerSession({ req: ctx.req as NextApiRequest });

  return getFeatureFlagMap(prisma, session?.user.id);
});
