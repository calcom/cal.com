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
  log.debug("Received webhook");

  const provider = (await context.params).provider as string[];
  const calendarSubscriptionAdapter = ADAPTERS[provider[0] as keyof typeof ADAPTERS];
  if (!calendarSubscriptionAdapter) {
    log.error("Unsupported provider", { provider });
    return NextResponse.json({ message: "Unsupported provider" }, { status: 400 });
  }

  try {
    const calendarSubscriptionService = new CalendarSubscriptionService({
      calendarSubscriptionPort: calendarSubscriptionAdapter,
      selectedCalendarRepository: new SelectedCalendarRepository(prisma),
      featuresRepository: new FeaturesRepository(prisma),
    });
    await calendarSubscriptionService.processWebhook({
      headers: request.headers,
      query: new URL(request.url).searchParams,
      body: await request.json(),
    });
    return NextResponse.json({ message: "Webhook processed" }, { status: 200 });
  } catch (error) {
    log.error("Error processing webhook", { error });
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export const POST = defaultResponderForAppDir(postHandler);
