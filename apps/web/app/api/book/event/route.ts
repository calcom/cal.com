import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { checkBotId } from "botid/server";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { piiHasher } from "@calcom/lib/server/PiiHasher";
import { checkCfTurnstileToken } from "@calcom/lib/server/checkCfTurnstileToken";
import { CreationSource } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

async function handler(req: NextRequest) {
  const userIp = getIP(req);
  const body = await req.json();

  if (process.env.NEXT_PUBLIC_CLOUDFLARE_USE_TURNSTILE_IN_BOOKER === "1") {
    await checkCfTurnstileToken({
      token: body["cfToken"] as string,
      remoteIp: userIp,
    });
  }

  // if (process.env.NEXT_PUBLIC_VERCEL_USE_BOTID_IN_BOOKER === "1") {
  //   const verification = await checkBotId({
  //     developmentOptions: {
  //       bypass: "BAD-BOT",
  //     },
  //   });

  //   if (verification.isBot) {
  //     return NextResponse.json({ error: "Access denied" }, { status: 403 });
  //   }
  // }

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: piiHasher.hash(userIp),
  });

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  const bookingData = {
    ...body,
    creationSource: CreationSource.WEBAPP,
  };

  const headersObj = await headers();
  const booking = await handleNewBooking({
    bookingData,
    userId: session?.user?.id || -1,
    hostname: headersObj.get("host") || "",
    forcedSlug: headersObj.get("x-cal-force-slug") as string | undefined,
  });

  return booking;
}

export const POST = defaultResponderForAppDir(handler, "/api/book/event");
