import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { DefaultAdapterFactory } from "@calcom/features/calendar-subscription/adapters/AdaptersFactory";
import { CalendarSubscriptionService } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionService";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import logger from "@calcom/lib/logger";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
import { prisma } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["cron"] });

/**
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

  const calendarSubscriptionService = new CalendarSubscriptionService({
    adapterFactory: new DefaultAdapterFactory(),
    selectedCalendarRepository: new SelectedCalendarRepository(prisma),
    featuresRepository: new FeaturesRepository(prisma),
  });
  try {
    await calendarSubscriptionService.checkForNewSubscriptions();
    return NextResponse.json({ ok: true });
  } catch (e) {
    log.error(e);
    return NextResponse.json({ message: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}

export const GET = defaultResponderForAppDir(postHandler);
