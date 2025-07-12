import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { cleanupExpiredQueuedFormResponses } from "@calcom/app-store/routing-forms/lib/cleanupQueuedFormResponses";

async function postHandler(request: NextRequest) {
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const result = await cleanupExpiredQueuedFormResponses(1);

  return NextResponse.json(result);
}

export const POST = defaultResponderForAppDir(postHandler);
