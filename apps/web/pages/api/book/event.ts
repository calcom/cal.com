import { wrapApiHandlerWithSentry } from "@sentry/nextjs";
import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import { checkIpIsLockedAndThrowError, handleAutoLock } from "@calcom/lib/autoLock";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

async function handler(req: NextApiRequest & { userId?: number }, res: NextApiResponse) {
  const userIp = getIP(req);

  await checkIpIsLockedAndThrowError(userIp);
  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: userIp,
    onRateLimiterResponse: async (rateLimitResponse) => {
      const didLock = await handleAutoLock({
        identifier: userIp,
        identifierType: "ip",
        rateLimitResponse,
      });

      if (didLock) {
        throw new HttpError({
          statusCode: 429,
          message: "Too many requests",
        });
      }
    },
  });

  const session = await getServerSession({ req, res });
  /* To mimic API behavior and comply with types */
  req.userId = session?.user?.id || -1;
  const booking = await handleNewBooking(req);
  return booking;
}

export default defaultResponder(wrapApiHandlerWithSentry(handler, "/api/book/event"));
