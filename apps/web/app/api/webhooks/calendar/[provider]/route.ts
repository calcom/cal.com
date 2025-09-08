import type { Params } from "app/_types";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { GoogleCalendarSubscriptionAdapter } from "@calcom/features/calendar-subscription/adapters/GoogleCalendarSubscription.adapter";
import { MicrosoftCalendarSubscriptionAdapter } from "@calcom/features/calendar-subscription/adapters/MicrosoftCalendarSubscription.adapter";
import { CalendarSubscriptionService } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionService";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import logger from "@calcom/lib/logger";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
import { prisma } from "@calcom/prisma";
import { defaultResponderForAppDir } from "@calcom/web/app/api/defaultResponderForAppDir";

const log = logger.getSubLogger({ prefix: ["calendar-webhook"] });

const ADAPTERS = {
  google: new GoogleCalendarSubscriptionAdapter(),
  microsoft: new MicrosoftCalendarSubscriptionAdapter(),
};

async function postHandler(request: NextRequest, context: { params: Promise<Params> }) {
  const provider = (await context.params).provider as string[];
  log.debug("Received webhook", { provider });

  const calendarSubscriptionAdapter = ADAPTERS[provider[0] as keyof typeof ADAPTERS];
  if (!calendarSubscriptionAdapter) {
    log.error("Unsupported provider", { provider });
    return NextResponse.json({ message: "Unsupported provider" }, { status: 400 });
  }

  const channelId = await calendarSubscriptionAdapter.extractChannelId({
    headers: request.headers,
    query: new URL(request.url).searchParams,
    body: await request.text(),
  });
  if (!channelId) {
    log.error("Missing channel ID in webhook");
    return NextResponse.json({ message: "Missing channel ID" }, { status: 400 });
  }

  try {
    const calendarSubscriptionService = new CalendarSubscriptionService({
      calendarSubscriptionPort: calendarSubscriptionAdapter,
      selectedCalendarRepository: new SelectedCalendarRepository(prisma),
      featuresRepository: new FeaturesRepository(prisma),
    });
    await calendarSubscriptionService.processWebhook(channelId);
  } catch (error) {
    log.error("Error processing webhook", { error, channelId });
    const message = error instanceof Error ? error.message : "Unknown error";
    const response = { message };
    return NextResponse.json(response, { status: 500 });
  }

  return NextResponse.json({ message: "Webhook processed" }, { status: 200 });
}

export const POST = defaultResponderForAppDir(postHandler);
