import { sentrySpan } from "@calcom/features/watchlist/lib/telemetry";
import { checkIfEmailIsBlockedInWatchlistController } from "@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller";
import type { NextApiRequest } from "next";

export async function isLockedOrBlocked(req: NextApiRequest) {
  const user = req.user;
  if (!user?.email) return false;
  return (
    user.locked ||
    (await checkIfEmailIsBlockedInWatchlistController({
      email: user.email,
      organizationId: null,
      span: sentrySpan,
    }))
  );
}
