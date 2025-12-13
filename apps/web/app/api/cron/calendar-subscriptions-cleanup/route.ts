import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { CalendarCacheEventService } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventService";
import { getCalendarCacheEventRepository } from "@calcom/features/di/containers/RepositoryContainer";
import { defaultResponderForAppDir } from "@calcom/web/app/api/defaultResponderForAppDir";

/**
 * Cron webhook
 * Cleanup stale calendar cache
 *
 * @param request
 * @returns
 */
async function getHandler(request: NextRequest) {
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // instantiate dependencies
  const calendarCacheEventRepository = getCalendarCacheEventRepository();
  const calendarCacheEventService = new CalendarCacheEventService({
    calendarCacheEventRepository,
  });

  try {
    await calendarCacheEventService.cleanupStaleCache();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`[calendar-subscriptions-cleanup] ${message}:`, e);
    return NextResponse.json({ message }, { status: 500 });
  }
}

export const GET = defaultResponderForAppDir(getHandler);
