import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { handleNewRecurringBooking } from "@calcom/features/bookings/lib/handleNewRecurringBooking";
import type { BookingResponse } from "@calcom/features/bookings/types";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { checkCfTurnstileToken } from "@calcom/lib/server/checkCfTurnstileToken";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

type PlatformParams = {
  platformClientId?: string;
  platformCancelUrl?: string;
  platformBookingUrl?: string;
  platformRescheduleUrl?: string;
  platformBookingLocation?: string;
};

async function handler(req: NextRequest) {
  const legacyReq = buildLegacyRequest(await headers(), await cookies());
  const userIp = getIP(legacyReq);

  const requestData = await parseRequestData(req);

  if (process.env.NEXT_PUBLIC_CLOUDFLARE_USE_TURNSTILE_IN_BOOKER === "1") {
    await checkCfTurnstileToken({
      token: requestData[0]["cfToken"] as string,
      remoteIp: userIp,
    });
  }

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: userIp,
  });

  const session = await getServerSession({ req: legacyReq });

  const platformParams: PlatformParams = {};
  if (requestData.platformClientId) platformParams.platformClientId = requestData.platformClientId;
  if (requestData.platformCancelUrl) platformParams.platformCancelUrl = requestData.platformCancelUrl;
  if (requestData.platformBookingUrl) platformParams.platformBookingUrl = requestData.platformBookingUrl;
  if (requestData.platformRescheduleUrl)
    platformParams.platformRescheduleUrl = requestData.platformRescheduleUrl;
  if (requestData.platformBookingLocation)
    platformParams.platformBookingLocation = requestData.platformBookingLocation;

  const createdBookings: BookingResponse[] = await handleNewRecurringBooking({
    bookingData: requestData,
    userId: session?.user?.id || -1,
    ...platformParams,
    noEmail: requestData.noEmail,
  });

  return NextResponse.json(createdBookings);
}

export const handleRecurringEventBooking = handler;

export const POST = defaultResponderForAppDir(handler);
