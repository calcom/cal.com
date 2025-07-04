import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";

async function getHandler(request: NextRequest) {
  const headersList = await headers();
  const ip = getIP(request);

  await checkRateLimitAndThrowError({
    rateLimitingType: "common",
    identifier: `geolocation-${ip}`,
  });

  const country = headersList.get("x-vercel-ip-country") || "Unknown";

  const response = NextResponse.json({ country });
  response.headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");

  return response;
}

export const GET = defaultResponderForAppDir(getHandler);
