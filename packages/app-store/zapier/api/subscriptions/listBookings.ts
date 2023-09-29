import type { NextApiRequest, NextApiResponse } from "next";

import { listBookings } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

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

    const requested = teamInfo ? `team: ${teamInfo}` : `user: ${userInfo}`;
    return res.status(404).json({
      message: `There are no bookings to retrieve, please create a booking first. Requested: \`${requested}\``,
    });
  }
  res.status(201).json(bookings);
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
