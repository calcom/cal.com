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

  const requestData = (await parseRequestData(req)) as any[];

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
  const firstItem = (requestData[0] || {}) as Record<string, any>;
  if (firstItem.platformClientId) platformParams.platformClientId = firstItem.platformClientId;
  if (firstItem.platformCancelUrl) platformParams.platformCancelUrl = firstItem.platformCancelUrl;
  if (firstItem.platformBookingUrl) platformParams.platformBookingUrl = firstItem.platformBookingUrl;
  if (firstItem.platformRescheduleUrl) platformParams.platformRescheduleUrl = firstItem.platformRescheduleUrl;
  if (firstItem.platformBookingLocation)
    platformParams.platformBookingLocation = firstItem.platformBookingLocation;

  const createdBookings: BookingResponse[] = await handleNewRecurringBooking({
    bookingData: requestData,
    userId: session?.user?.id || -1,
    ...platformParams,
    noEmail: firstItem.noEmail,
  });

  return NextResponse.json(createdBookings);
}

export const handleRecurringEventBooking = handler;

export const POST = defaultResponderForAppDir(handler);
