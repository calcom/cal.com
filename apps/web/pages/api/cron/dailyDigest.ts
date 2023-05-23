import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ message: "Invalid method" });
    return;
  }

  // TODO: Find users whose daily digest time is set to this moment (within a 5m tolerance?)
  // For each, find bookings beginning in the next 24hrs and email as a daily digest

  let notificationsSent = 0;
  for (const _ of []) {
    // await sendOrganizerDailyDigestEmail([]);

    notificationsSent++;
  }
  res.status(200).json({ notificationsSent });
}
