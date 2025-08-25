import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { CalendarCacheSqlService } from "@calcom/features/calendar-cache-sql/CalendarCacheSqlService";
import { CalendarEventRepository } from "@calcom/features/calendar-cache-sql/CalendarEventRepository";
import { CalendarSubscriptionRepository } from "@calcom/features/calendar-cache-sql/CalendarSubscriptionRepository";
import { GoogleCalendarWebhookService } from "@calcom/features/calendar-cache-sql/GoogleCalendarWebhookService";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import logger from "@calcom/lib/logger";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
import prisma from "@calcom/prisma";

import { defaultResponderForAppDir } from "../../../api/defaultResponderForAppDir";

const log = logger.getSubLogger({ prefix: ["GoogleCalendarSqlWebhook"] });

async function postHandler(request: NextRequest) {
  const subscriptionRepo = new CalendarSubscriptionRepository(prisma);
  const eventRepo = new CalendarEventRepository(prisma);
  const selectedCalendarRepo = new SelectedCalendarRepository(prisma);
  const featuresRepo = new FeaturesRepository(prisma);
  const calendarCacheService = new CalendarCacheSqlService(subscriptionRepo, eventRepo, selectedCalendarRepo);

  const isSqlWriteEnabled = await featuresRepo.checkIfFeatureIsEnabledGlobally("calendar-cache-sql-write");
  if (!isSqlWriteEnabled) {
    log.debug("SQL cache write not enabled globally");
    return NextResponse.json({ success: false, message: "SQL cache write not enabled globally" });
  }

  // Validate webhook token
  const webhookToken = process.env.GOOGLE_WEBHOOK_TOKEN || "";
  const channelToken = request.headers.get("x-goog-channel-token");

  if (channelToken !== webhookToken) {
    log.debug("Invalid webhook token", { channelToken });
    return NextResponse.json({ message: "Invalid API key" }, { status: 403 });
  }

  const webhookService = new GoogleCalendarWebhookService({
    subscriptionRepo,
    eventRepo,
    calendarCacheService,
    getCredentialForCalendarCache,
    logger: log,
  });

  const channelId = request.headers.get("x-goog-channel-id");
  if (!channelId) {
    log.debug("Missing Channel ID");
    return NextResponse.json({ message: "Missing Channel ID" }, { status: 403 });
  }

  const response = await webhookService.processWebhook(channelId);

  return NextResponse.json(response.body, { status: response.status });
}

export const POST = defaultResponderForAppDir(postHandler);
