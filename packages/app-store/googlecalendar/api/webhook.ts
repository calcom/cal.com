import type { NextApiRequest, NextApiResponse } from "next";

import { defaultHandler, defaultResponder } from "@calcom/lib/server";

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }
  // 1. validate request
  if (req.headers["x-goog-channel-token"] !== process.env.CRON_API_KEY) {
    return res.status(403).json({ message: "Invalid API key" });
  }

  console.log("req.body", JSON.stringify(req.body));
  // Returning empty string
  console.log("req.query", JSON.stringify(req.query));
  // Not useful data
  console.log("req.headers", JSON.stringify(req.headers));
  /**
    "x-goog-resource-uri": "https://www.googleapis.com/calendar/v3/calendars/c_xxxxxxxxxxx%40group.calendar.google.com/events?alt=json",
    "x-goog-resource-state": "sync",
    "x-goog-resource-id": "jTIWK7916gSqPrP_3eqwQX-klFU",
    "x-goog-message-number": "1",
    "x-goog-channel-token": "DUMMY_API_KEY",
    "x-goog-channel-id": "891433de-3eb5-447d-9ab5-8d89c32613aa",
    "x-goog-channel-expiration": "Tue, 24 Oct 2023 03:34:14 GMT",
   */
  // TODO:
  // 2. Invalidate current cache
  // 3. Refresh cache with longer timeout
  res.status(200).json({ message: "ok" });
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
