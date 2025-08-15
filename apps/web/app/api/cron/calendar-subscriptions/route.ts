import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { CalendarSubscriptionRepository } from "@calcom/features/calendar-cache-sql/CalendarSubscriptionRepository";
import { CalendarSubscriptionService } from "@calcom/features/calendar-cache-sql/CalendarSubscriptionService";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import logger from "@calcom/lib/logger";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
import prisma from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["CalendarSubscriptionsSqlCron"] });

async function getHandler(req: NextRequest) {
  const apiKey = req.headers.get("authorization") || req.nextUrl.searchParams.get("apiKey");

  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  try {
    const featuresRepo = new FeaturesRepository(prisma);
    const isSqlWriteEnabled = await featuresRepo.checkIfFeatureIsEnabledGlobally("calendar-cache-sql-write");

    if (!isSqlWriteEnabled) {
      log.debug("SQL cache write not enabled globally");
      return NextResponse.json({ message: "SQL cache write disabled" });
    }

    const calendarSubscriptionService = new CalendarSubscriptionService({
      subscriptionRepo: new CalendarSubscriptionRepository(prisma),
      selectedCalendarRepo: new SelectedCalendarRepository(prisma),
    });

    const result = await calendarSubscriptionService.processNextBatch({ batchSize: 50 });
    return NextResponse.json(result);
  } catch (error) {
    log.error("Calendar subscriptions SQL cron error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export const GET = defaultResponderForAppDir(getHandler);
