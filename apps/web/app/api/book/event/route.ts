import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { checkCfTurnstileToken } from "@calcom/lib/server/checkCfTurnstileToken";
import { CreationSource } from "@calcom/prisma/enums/index";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

async function handler(req: NextRequest) {
  const legacyReq = buildLegacyRequest(await headers(), await cookies());
  const userIp = getIP(legacyReq);

  const requestData = await parseRequestData(req);

  if (process.env.NEXT_PUBLIC_CLOUDFLARE_USE_TURNSTILE_IN_BOOKER === "1") {
    await checkCfTurnstileToken({
      token: requestData["cfToken"] as string,
      remoteIp: userIp,
    });
  }

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: userIp,
  });

  const session = await getServerSession({ req: legacyReq });
  const bookingData = {
    ...requestData,
    creationSource: CreationSource.WEBAPP,
  };

  const booking = await handleNewBooking({
    bookingData,
    userId: session?.user?.id || -1,
    hostname: legacyReq.headers.host || "",
    forcedSlug: legacyReq.headers["x-cal-force-slug"] as string | undefined,
  });

  return NextResponse.json(booking);
}

export const POST = defaultResponderForAppDir(handler);
