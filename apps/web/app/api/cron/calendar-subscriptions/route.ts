import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { DefaultAdapterFactory } from "@calcom/features/calendar-subscription/adapters/AdaptersFactory";
import { CalendarSubscriptionService } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionService";
import { CalendarCacheEventRepository } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository";
import { CalendarCacheEventService } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventService";
import { CalendarSyncService } from "@calcom/features/calendar-subscription/lib/sync/CalendarSyncService";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import logger from "@calcom/lib/logger";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
import { prisma } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["cron"] });

/**
 * Cron webhook
 * Checks for new calendar subscriptions (rollouts)
 *
 * @param request
 * @returns
 */
async function postHandler(request: NextRequest) {
  log.info("Checking for new calendar subscriptions");
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  // instantiate dependencies
  const calendarSyncService = new CalendarSyncService();
  const calendarCacheEventRepository = new CalendarCacheEventRepository(prisma);
  const calendarCacheEventService = new CalendarCacheEventService({
    calendarCacheEventRepository,
  });

  const calendarSubscriptionService = new CalendarSubscriptionService({
    adapterFactory: new DefaultAdapterFactory(),
    selectedCalendarRepository: new SelectedCalendarRepository(prisma),
    featuresRepository: new FeaturesRepository(prisma),
    calendarSyncService,
    calendarCacheEventService,
  });

  // are features globally enabled
  const [isCacheEnabled, isSyncEnabled] = await Promise.all([
    calendarSubscriptionService.isCacheEnabled(),
    calendarSubscriptionService.isSyncEnabled(),
  ]);

  if (!isCacheEnabled || !isSyncEnabled) {
    log.info("Calendar subscriptions are disabled");
    return NextResponse.json({ ok: true });
  }

  try {
    await calendarSubscriptionService.checkForNewSubscriptions();
    log.info("Checked for new calendar subscriptions successfully");
    return NextResponse.json({ ok: true });
  } catch (e) {
    log.error("Error checking for new calendar subscriptions", { error: e });
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export const GET = defaultResponderForAppDir(postHandler);
