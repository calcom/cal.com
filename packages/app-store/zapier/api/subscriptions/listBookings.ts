import type { NextApiRequest, NextApiResponse } from "next";

import isAuthorized from "@calcom/features/auth/lib/oAuthAuthorization";
import findValidApiKey from "@calcom/features/ee/api-keys/lib/findValidApiKey";
import { listBookings } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.query.apiKey as string;

  let validKey: any = null;

  if (apiKey) {
    validKey = await findValidApiKey(apiKey, "zapier");

    if (!validKey) {
      return res.status(401).json({ message: "API key not valid" });
    }
  }

  let authorizedAccount: {
    id: number;
    name: string | null;
    isTeam: boolean;
  } | null = null;

  if (!apiKey) {
    authorizedAccount = await isAuthorized(req, ["READ_BOOKING"]);
  }
  if (!authorizedAccount && !validKey) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const bookings = await listBookings(validKey, authorizedAccount);

  if (!bookings) {
    return res.status(500).json({ message: "Unable to get bookings." });
  }
  if (bookings.length === 0) {
    const userInfo = validKey ? validKey.userId : !authorizedAccount.isTeam ? authorizedAccount.name : null;
    const teamInfo = validKey ? validKey.teamId : authorizedAccount.isTeam ? authorizedAccount.name : null;

    const requested = teamInfo ? "team: " + teamInfo : "user: " + userInfo;
    return res.status(404).json({
      message: `There are no bookings to retrieve, please create a booking first. Requested: \`${requested}\``,
    });
  }
  res.status(201).json(bookings);
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
