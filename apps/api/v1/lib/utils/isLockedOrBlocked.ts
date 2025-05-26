import type { NextApiRequest } from "next";

import { checkIfEmailIsBlockedInWatchlistController } from "@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller";

export async function isLockedOrBlocked(req: NextApiRequest) {
  const user = req.user;
  if (!user?.email) return false;
  return user.locked || (await checkIfEmailIsBlockedInWatchlistController(user.email));
}
