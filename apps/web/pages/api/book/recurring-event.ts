import type { NextApiRequest } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getRecurringBookingService } from "@calcom/features/bookings/di/RecurringBookingService.container";
import type { BookingResponse } from "@calcom/features/bookings/types";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { piiHasher } from "@calcom/lib/server/PiiHasher";
import { checkCfTurnstileToken } from "@calcom/lib/server/checkCfTurnstileToken";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

// @TODO: Didn't look at the contents of this function in order to not break old booking page.

type PlatformParams = {
  platformClientId?: string;
  platformCancelUrl?: string;
  platformBookingUrl?: string;
  platformRescheduleUrl?: string;
  platformBookingLocation?: string;
};

type RequestMeta = {
  userId?: number;
  hostname?: string;
  forcedSlug?: string;
  noEmail?: boolean;
} & PlatformParams;

async function handler(req: NextApiRequest & RequestMeta) {
  const userIp = getIP(req);

  if (process.env.NEXT_PUBLIC_CLOUDFLARE_USE_TURNSTILE_IN_BOOKER === "1") {
    await checkCfTurnstileToken({
      token: req.body[0]["cfToken"] as string,
      remoteIp: userIp,
    });
  }

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `createRecurringBooking:${piiHasher.hash(userIp)}`,
  });
  const session = await getServerSession({ req });
  /* To mimic API behavior and comply with types */

  const recurringBookingService = getRecurringBookingService();
  const createdBookings: BookingResponse[] = await recurringBookingService.createBooking({
    bookingData: req.body,
    bookingMeta: {
      userId: session?.user?.id || -1,
      platformClientId: req.platformClientId,
      platformCancelUrl: req.platformCancelUrl,
      platformBookingUrl: req.platformBookingUrl,
      platformRescheduleUrl: req.platformRescheduleUrl,
      platformBookingLocation: req.platformBookingLocation,
      noEmail: req.noEmail,
    },
  });

  return createdBookings;
}

export const handleRecurringEventBooking = handler;

export default defaultResponder(handler);
