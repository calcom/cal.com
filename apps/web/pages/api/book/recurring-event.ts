import type { NextApiRequest } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { handleNewRecurringBooking } from "@calcom/features/bookings/lib/handleNewRecurringBooking";
import type { BookingResponse } from "@calcom/features/bookings/types";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { checkBotId } from "@calcom/lib/server/checkBotId";
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

  await checkBotId();

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: userIp,
  });
  const session = await getServerSession({ req });
  /* To mimic API behavior and comply with types */

  const createdBookings: BookingResponse[] = await handleNewRecurringBooking({
    bookingData: req.body,
    userId: session?.user?.id || -1,
    platformClientId: req.platformClientId,
    platformCancelUrl: req.platformCancelUrl,
    platformBookingUrl: req.platformBookingUrl,
    platformRescheduleUrl: req.platformRescheduleUrl,
    platformBookingLocation: req.platformBookingLocation,
    noEmail: req.noEmail,
  });

  return createdBookings;
}

export const handleRecurringEventBooking = handler;

export default defaultResponder(handler);
