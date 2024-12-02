import type { NextApiRequest } from "next";

import { checkIfEmailInBlacklistController } from "@calcom/features/blacklist/operations/check-if-email-in-blacklist.controller";

export async function isLockedOrBlocked(req: NextApiRequest) {
  const user = req.user;
  if (!user?.email) return false;
  return user.locked || (await checkIfEmailInBlacklistController(user.email));
}
