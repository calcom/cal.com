import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { CalendarEventRepository } from "@calcom/features/calendar-cache-sql/CalendarEventRepository";
import { CalendarSubscriptionRepository } from "@calcom/features/calendar-cache-sql/CalendarSubscriptionRepository";
import { GoogleCalendarWebhookService } from "@calcom/features/calendar-cache-sql/GoogleCalendarWebhookService";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import { defaultResponderForAppDir } from "../../../api/defaultResponderForAppDir";

const log = logger.getSubLogger({ prefix: ["GoogleCalendarSqlWebhook"] });

async function postHandler(request: NextRequest, { params }: { params: Promise<any> }) {
  const subscriptionRepo = new CalendarSubscriptionRepository(prisma);
  const eventRepo = new CalendarEventRepository(prisma);
  const featuresRepo = new FeaturesRepository();

  const webhookService = new GoogleCalendarWebhookService({
    subscriptionRepo,
    eventRepo,
    featuresRepo,
    getCredentialForCalendarCache,
    webhookToken: process.env.GOOGLE_WEBHOOK_TOKEN || "",
    logger: log,
  });

  const webhookRequest = {
    headers: {
      "x-goog-channel-token": request.headers.get("x-goog-channel-token") || undefined,
      "x-goog-channel-id": request.headers.get("x-goog-channel-id") || undefined,
    },
  };

  const response = await webhookService.processWebhook(webhookRequest);

  return NextResponse.json(response.body, { status: response.status });
}

export const POST = defaultResponderForAppDir(postHandler);
