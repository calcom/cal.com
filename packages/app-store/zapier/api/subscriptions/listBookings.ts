import type { NextApiRequest, NextApiResponse } from "next";

import { listBookings } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

import { validateAccountOrApiKey } from "../../lib/validateAccountOrApiKey";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { account: authorizedAccount, appApiKey: validKey } = await validateAccountOrApiKey(req, [
    "READ_BOOKING",
  ]);
  const bookings = await listBookings(validKey, authorizedAccount);

  if (!bookings) {
    return res.status(500).json({ message: "Unable to get bookings." });
  }
  if (bookings.length === 0) {
    const userInfo = validKey
      ? validKey.userId
      : authorizedAccount && !authorizedAccount.isTeam
      ? authorizedAccount.name
      : null;
    const teamInfo = validKey
      ? validKey.teamId
      : authorizedAccount && authorizedAccount.isTeam
      ? authorizedAccount.name
      : null;

    return res.status(201).json([]);
  }
  res.status(201).json(bookings);
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
