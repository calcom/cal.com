import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { compose, defaultResponder } from "@calcom/lib/server";
import type { Handler } from "@calcom/lib/server/compose";
import { postHandler } from "@calcom/lib/server/postHandler";
import { validateCsrfToken } from "@calcom/lib/server/validateCsrfToken";

const rateLimit =
  (handler: Handler): Handler =>
  async (req, res) => {
    const userIp = getIP(req);
    await checkRateLimitAndThrowError({
      rateLimitingType: "core",
      identifier: userIp,
    });
    return handler(req, res);
  };

async function handler(req: NextApiRequest & { userId?: number }, res: NextApiResponse) {
  const session = await getServerSession({ req, res });
  /* To mimic API behavior and comply with types */
  req.userId = session?.user?.id || -1;
  const booking = await handleNewBooking(req);
  res.json(booking);
}

export default compose(
  [
    //
    postHandler,
    defaultResponder,
    rateLimit,
    validateCsrfToken,
  ],
  handler
);
