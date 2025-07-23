import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { CalendarEventRepository } from "@calcom/features/calendar-cache-sql/calendar-event.repository";
import { CalendarSubscriptionRepository } from "@calcom/features/calendar-cache-sql/calendar-subscription.repository";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["GoogleCalendarSqlWebhook"] });

async function postHandler(request: NextRequest) {
  const channelToken = request.headers.get("x-goog-channel-token");
  const channelId = request.headers.get("x-goog-channel-id");

  log.debug("postHandler", safeStringify({ channelToken, channelId }));
  if (channelToken !== process.env.GOOGLE_WEBHOOK_TOKEN) {
    throw new HttpError({ statusCode: 403, message: "Invalid API key" });
  }
  if (typeof channelId !== "string") {
    throw new HttpError({ statusCode: 403, message: "Missing Channel ID" });
  }

  try {
    const featuresRepo = new FeaturesRepository();
    const isSqlWriteEnabled = await featuresRepo.checkIfFeatureIsEnabledGlobally("calendar-cache-sql-write");

    if (!isSqlWriteEnabled) {
      log.debug("SQL cache write not enabled globally");
      return NextResponse.json({ message: "ok" });
    }

    const subscriptionRepo = new CalendarSubscriptionRepository(prisma);
    const eventRepo = new CalendarEventRepository(prisma);

    const subscription = await subscriptionRepo.findByChannelId(channelId);
    if (!subscription) {
      log.info("No subscription found for channelId", { channelId });
      return NextResponse.json({ message: "ok" });
    }

    if (!subscription.selectedCalendar?.credential) {
      log.info("No credential found for subscription", { channelId });
      return NextResponse.json({ message: "ok" });
    }

    const credentialForCalendarCache = await getCredentialForCalendarCache({
      credentialId: subscription.selectedCalendar.credential.id,
    });
    const calendarService = await getCalendar(credentialForCalendarCache);

    if (!calendarService) {
      log.error("Could not get calendar service", { channelId });
      return NextResponse.json({ message: "Calendar service unavailable" }, { status: 500 });
    }

    await calendarService.fetchAvailabilityAndSetCache?.([subscription.selectedCalendar]);

    return NextResponse.json({ message: "ok" });
  } catch (error) {
    log.error("Google Calendar SQL webhook error:", safeStringify({ error }));
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export const POST = defaultResponderForAppDir(postHandler);
