import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { checkCfTurnstileToken } from "@calcom/lib/server/checkCfTurnstileToken";
import { CreationSource } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export async function POST(request: NextRequest) {
  const legacyReq = buildLegacyRequest(headers(), cookies());
  try {
    const userIp = getIP(legacyReq);
    const body = await request.json();

    if (process.env.NEXT_PUBLIC_CLOUDFLARE_USE_TURNSTILE_IN_BOOKER === "1") {
      await checkCfTurnstileToken({
        token: body["cfToken"] as string,
        remoteIp: userIp,
      });
    }

    await checkRateLimitAndThrowError({
      rateLimitingType: "core",
      identifier: userIp,
    });

    // Add the body to the legacy request
    legacyReq.body = {
      ...body,
      creationSource: CreationSource.WEBAPP,
    };

    const session = await getServerSession({ req: legacyReq });

    // Add userId to the legacy request to mimic API behavior
    legacyReq.userId = session?.user?.id || -1;

    const booking = await handleNewBooking(legacyReq);

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Error creating booking:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message },
        { status: error.name === "ValidationError" ? 400 : 500 }
      );
    }

    return NextResponse.json({ message: "An unexpected error occurred" }, { status: 500 });
  }
}
