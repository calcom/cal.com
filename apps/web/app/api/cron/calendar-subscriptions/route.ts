import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { runCalendarSubscriptionRollout } from "@calcom/features/calendar-subscription/lib/runCalendarSubscriptionRollout";
import { defaultResponderForAppDir } from "@calcom/web/app/api/defaultResponderForAppDir";

/**
 * Cron webhook
 * Checks for new calendar subscriptions (rollouts)
 *
 * @param request
 * @returns
 */
async function getHandler(request: NextRequest) {
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    return NextResponse.json({ message: "Forbiden" }, { status: 403 });
  }

  try {
    const result = await runCalendarSubscriptionRollout();
    return NextResponse.json({ ok: true, skipped: result.skipped });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export const GET = defaultResponderForAppDir(getHandler);
