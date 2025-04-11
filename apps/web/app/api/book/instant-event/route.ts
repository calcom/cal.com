import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleInstantMeeting from "@calcom/features/instant-meeting/handleInstantMeeting";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { CreationSource } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

async function handler(req: NextRequest) {
  const legacyReq = buildLegacyRequest(await headers(), await cookies());
  const userIp = getIP(legacyReq);

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `instant.event-${userIp}`,
  });

  const session = await getServerSession({ req: legacyReq });
  const requestData = await parseRequestData(req);

  legacyReq.userId = session?.user?.id || -1;
  legacyReq.body = {
    ...requestData,
    creationSource: CreationSource.WEBAPP,
  };

  const booking = await handleInstantMeeting(legacyReq);
  return NextResponse.json(booking);
}

export const POST = defaultResponderForAppDir(handler);
