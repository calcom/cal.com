import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { defaultResponder } from "@calcom/lib/server";

async function handler(req: NextApiRequest & { userId?: number }, res: NextApiResponse) {
  const userIp = getIP(req);

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: userIp,
  });

  const session = await getServerSession({ req, res });
  /* To mimic API behavior and comply with types */
  req.userId = session?.user?.id || -1;
  const booking = await handleNewBooking(req, {
    isNotAnApiCall: true,
  });
  return booking;
}

export default defaultResponder(handler);
