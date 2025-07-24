import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { CalendarSubscriptionRepository } from "@calcom/features/calendar-cache-sql/calendar-subscription.repository";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import prisma from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["CalendarSubscriptionsSqlCron"] });

async function postHandler(req: NextRequest) {
  const apiKey = req.headers.get("authorization") || req.nextUrl.searchParams.get("apiKey");

  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  try {
    const featuresRepo = new FeaturesRepository();
    const isSqlWriteEnabled = await featuresRepo.checkIfFeatureIsEnabledGlobally("calendar-cache-sql-write");

    if (!isSqlWriteEnabled) {
      log.debug("SQL cache write not enabled globally");
      return NextResponse.json({ message: "SQL cache write disabled" });
    }

    const subscriptionRepo = new CalendarSubscriptionRepository(prisma);
    const selectedCalendars = await SelectedCalendarRepository.getNextBatchForSqlCache(50);

    let createdCount = 0;
    let errorCount = 0;

    for (const selectedCalendar of selectedCalendars) {
      try {
        await subscriptionRepo.upsert({
          selectedCalendar: { connect: { id: selectedCalendar.id } },
        });

        createdCount++;
      } catch (error) {
        log.error(
          `Failed to create subscription for selected calendar ${selectedCalendar.id}:`,
          safeStringify({ error })
        );
        errorCount++;
      }
    }

    const subscriptionsToWatch = await subscriptionRepo.getSubscriptionsToWatch(50);
    let watchedCount = 0;

    for (const subscription of subscriptionsToWatch) {
      try {
        if (!subscription.selectedCalendar?.credential) continue;

        const credentialForCalendarCache = await getCredentialForCalendarCache({
          credentialId: subscription.selectedCalendar.credential.id,
        });
        const calendarService = await getCalendar(credentialForCalendarCache);

        if (!calendarService?.watchCalendar) continue;

        const watchResult = (await calendarService.watchCalendar({
          calendarId: subscription.selectedCalendar.externalId,
          eventTypeIds: [],
        })) as { id?: string | null; expiration?: string | null; token?: string | null } | undefined;

        if (watchResult?.id && watchResult?.expiration) {
          await subscriptionRepo.updateWatchDetails(subscription.id, {
            googleChannelId: watchResult.id,
            googleChannelToken: watchResult.token || "",
            googleChannelExpiration: watchResult.expiration,
          });
        }

        await subscriptionRepo.clearWatchError(subscription.id);
        watchedCount++;
      } catch (error) {
        log.error(`Failed to watch calendar subscription ${subscription.id}:`, safeStringify({ error }));
        await subscriptionRepo.setWatchError(
          subscription.id,
          error instanceof Error ? error.message : String(error)
        );
        errorCount++;
      }
    }

    return NextResponse.json({
      createdCount,
      watchedCount,
      errorCount,
      totalProcessed: selectedCalendars.length + subscriptionsToWatch.length,
    });
  } catch (error) {
    log.error("Calendar subscriptions SQL cron error:", safeStringify({ error }));
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export const POST = defaultResponderForAppDir(postHandler);
