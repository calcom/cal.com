import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleInstantMeeting from "@calcom/features/instant-meeting/handleInstantMeeting";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { defaultResponder } from "@calcom/lib/server";

async function handler(req: NextApiRequest & { userId?: number }, res: NextApiResponse) {
  const userIp = getIP(req);

  try {
    await checkRateLimitAndThrowError({
      rateLimitingType: "core",
      identifier: `instant.event-${userIp}`,
    });
  } catch (error) {
    return res.status(429).json({ message: "Rate limit exceeded" });
  }

  const session = await getServerSession({ req, res });
  req.userId = session?.user?.id || -1;
  const booking = await handleInstantMeeting(req);
  return booking;
}
export default defaultResponder(handler);
