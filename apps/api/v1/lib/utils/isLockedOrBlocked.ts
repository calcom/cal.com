import type { NextApiRequest } from "next";

import { checkIfEmailIsBlockedInWatchlistController } from "@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller";
import type { PrismaClient } from "@calcom/prisma/client";

export async function isLockedOrBlocked(req: NextApiRequest, prisma?: PrismaClient) {
  const user = req.user;
  if (!user?.email) return false;
  return (
    user.locked || (await checkIfEmailIsBlockedInWatchlistController(user.email, undefined, prisma)).isBlocked
  );
}
