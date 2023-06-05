import type { NextApiRequest, NextApiResponse } from "next";

import { listBookings } from "@calcom/app-store/_utils/nodeScheduler";
import findValidApiKey from "@calcom/features/ee/api-keys/lib/findValidApiKey";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.query.apiKey as string;

  if (!apiKey) {
    return res.status(401).json({ message: "No API key provided" });
  }

  const validKey = await findValidApiKey(apiKey, "zapier");

  if (!validKey) {
    return res.status(401).json({ message: "API key not valid" });
  }

  const bookings = await listBookings(validKey);

  if (!bookings) {
    return res.status(500).json({ message: "Unable to get bookings." });
  }
  res.status(201).json(bookings);
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
