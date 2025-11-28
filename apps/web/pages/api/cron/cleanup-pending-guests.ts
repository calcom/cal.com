import type { NextApiRequest, NextApiResponse } from "next";

import { cleanupExpiredPendingGuests } from "@calcom/features/bookings/lib/cleanupExpiredPendingGuests";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

const validateRequest = (req: NextApiRequest) => {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  validateRequest(req);

  const deletedCount = await cleanupExpiredPendingGuests();

  return res.status(200).json({
    executedAt: new Date().toISOString(),
    deletedCount,
  });
};

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
