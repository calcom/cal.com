import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { CalendarSubscriptionRepository } from "@calcom/features/calendar-sync/CalendarSubscriptionRepository";
import { CalendarSyncService } from "@calcom/features/calendar-sync/CalendarSyncService";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import logger from "@calcom/lib/logger";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
import { prisma } from "@calcom/prisma";

import { defaultResponderForAppDir } from "../../../api/defaultResponderForAppDir";

const log = logger.getSubLogger({ prefix: ["GoogleCalendarSqlWebhook"] });

async function postHandler(request: NextRequest) {
  const calendarSubscriptionRepository = new CalendarSubscriptionRepository(prisma);
  const selectedCalendarRepository = new SelectedCalendarRepository(prisma);
  const featuresRepository = new FeaturesRepository(prisma);

  const webhookToken = process.env.GOOGLE_WEBHOOK_TOKEN;
  if (!webhookToken) {
    log.debug("Missing webhook token");
    return NextResponse.json({ message: "Missing webhook token" }, { status: 403 });
  }

  const channelToken = request.headers.get("x-goog-channel-token");
  if (!channelToken) {
    log.debug("Missing channel token");
    return NextResponse.json({ message: "Missing channel token" }, { status: 403 });
  }

  if (channelToken !== webhookToken) {
    log.debug("Invalid webhook token", { channelToken });
    return NextResponse.json({ message: "Invalid API key" }, { status: 403 });
  }

  const isCalendarSyncEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("calendar-sync");
  if (!isCalendarSyncEnabled) {
    log.debug("Calendar sync not enabled globally");
    return NextResponse.json({ success: false, message: "Calendar sync not enabled" });
  }

  const calendarSyncService = new CalendarSyncService({
    selectedCalendarRepository,
    calendarSubscriptionRepository,
  });

  const response = await calendarSyncService.processWebhook();

  const channelId = request.headers.get("x-goog-channel-id");
  if (!channelId) {
    log.debug("Missing Channel ID");
    return NextResponse.json({ message: "Missing Channel ID" }, { status: 403 });
  }

  return NextResponse.json(response.body, { status: response.status });
}

export const POST = defaultResponderForAppDir(postHandler);
