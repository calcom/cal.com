import type { NextApiRequest } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { handleNewRecurringBooking } from "@calcom/features/bookings/lib/handleNewRecurringBooking";
import type { BookingResponse } from "@calcom/features/bookings/types";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { defaultResponder } from "@calcom/lib/server";
import { checkCfTurnstileToken } from "@calcom/lib/server/checkCfTurnstileToken";

// @TODO: Didn't look at the contents of this function in order to not break old booking page.

async function handler(req: NextApiRequest & { userId?: number }) {
  const userIp = getIP(req);

  if (process.env.NEXT_PUBLIC_CLOUDFLARE_USE_TURNSTILE_IN_BOOKER === "1") {
    await checkCfTurnstileToken({
      token: req.body[0]["cfToken"] as string,
      remoteIp: userIp,
    });
  }

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: userIp,
  });
  const session = await getServerSession({ req });
  /* To mimic API behavior and comply with types */
  req.userId = session?.user?.id || -1;

  const createdBookings: BookingResponse[] = await handleNewRecurringBooking(req);

  return createdBookings;
}

export const handleRecurringEventBooking = handler;

export default defaultResponder(handler);
