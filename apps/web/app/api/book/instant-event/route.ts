import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleInstantMeeting from "@calcom/features/instant-meeting/handleInstantMeeting";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { CreationSource } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "../../../../lib/buildLegacyCtx";
import { defaultResponderForAppDir } from "../../../api/defaultResponderForAppDir";

async function handler(req: NextRequest) {
  const body = await req.json();
  const legacyRequest = buildLegacyRequest(headers(), cookies());
  const userIp = getIP(legacyRequest);

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `instant.event-${userIp}`,
  });

  const session = await getServerSession({ req: legacyRequest });
  /* To mimic API behavior and comply with types */
  legacyRequest.userId = session?.user?.id || -1;
  legacyRequest.body = {
    ...body,
    creationSource: CreationSource.WEBAPP,
  };
  const booking = await handleInstantMeeting(legacyRequest);
  return NextResponse.json(booking);
}

export const POST = defaultResponderForAppDir(handler, "/api/book/instant-event");
