import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleInstantMeeting from "@calcom/features/instant-meeting/handleInstantMeeting";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { CreationSource } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export async function POST(request: NextRequest) {
  try {
    const legacyReq = buildLegacyRequest(headers(), cookies());
    const userIp = getIP(legacyReq);
    const body = await request.json();

    await checkRateLimitAndThrowError({
      rateLimitingType: "core",
      identifier: `instant.event-${userIp}`,
    });

    // Add the body to the legacy request
    legacyReq.body = {
      ...body,
      creationSource: CreationSource.WEBAPP,
    };

    const session = await getServerSession({ req: legacyReq });

    // Add userId to the legacy request to mimic API behavior
    legacyReq.userId = session?.user?.id || -1;

    const booking = await handleInstantMeeting(legacyReq);

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Error creating instant meeting:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message },
        { status: error.name === "ValidationError" ? 400 : 500 }
      );
    }

    return NextResponse.json({ message: "An unexpected error occurred" }, { status: 500 });
  }
}
