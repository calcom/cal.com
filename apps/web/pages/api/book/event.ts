import { wrapApiHandlerWithSentry } from "@sentry/nextjs";
import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { defaultResponder } from "@calcom/lib/server";
import { checkCfTurnstileToken } from "@calcom/lib/server/checkCfTurnstileToken";

async function handler(req: NextApiRequest & { userId?: number }, res: NextApiResponse) {
  const userIp = getIP(req);

  if (process.env.NEXT_PUBLIC_CLOUDFLARE_USE_TURNSTILE_IN_BOOKER === "1") {
    await checkCfTurnstileToken({
      token: req.body["cfToken"] as string,
      remoteIp: userIp,
    });
  }

  try {
    await checkRateLimitAndThrowError({
      rateLimitingType: "core",
      identifier: userIp,
    });
  } catch (error) {
    return res.status(429).json({ message: "Rate limit exceeded" });
  }

  const session = await getServerSession({ req, res });
  /* To mimic API behavior and comply with types */
  req.userId = session?.user?.id || -1;
  const booking = await handleNewBooking(req);
  return booking;
}

export default defaultResponder(wrapApiHandlerWithSentry(handler, "/api/book/event"));
