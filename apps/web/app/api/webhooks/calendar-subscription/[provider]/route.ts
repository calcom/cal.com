import type { Params } from "app/_types";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type { CalendarSubscriptionProvider } from "@calcom/features/calendar-subscription/adapters/AdaptersFactory";
import { DefaultAdapterFactory } from "@calcom/features/calendar-subscription/adapters/AdaptersFactory";
import { CalendarSubscriptionService } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionService";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import logger from "@calcom/lib/logger";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
import { prisma } from "@calcom/prisma";
import { defaultResponderForAppDir } from "@calcom/web/app/api/defaultResponderForAppDir";

const log = logger.getSubLogger({ prefix: ["calendar-webhook"] });

/**
 * Handles incoming POST requests for calendar webhooks.
 * It processes the webhook based on the calendar provider specified in the URL.
 * If the provider is unsupported, it returns a 400 response.
 * If the webhook is processed successfully, it returns a 200 response.
 * In case of errors during processing, it returns a 500 response with the error message.
 * @param {NextRequest} request - The incoming request object.
 * @param {Object} context - The context object containing route parameters.
 * @param {Promise<Params>} context.params - A promise that resolves to the route parameters.
 * @returns {Promise<NextResponse>} - A promise that resolves to the response object.
 */
async function postHandler(request: NextRequest, context: { params: Promise<Params> }) {
  log.debug("Received webhook");

  // extract and validate provider
  const provider = (await context.params).provider as string[][0] as CalendarSubscriptionProvider;
  const allowed = new Set<CalendarSubscriptionProvider>(["google_calendar", "office365_calendar"]);
  if (!allowed.has(provider as CalendarSubscriptionProvider)) {
    return NextResponse.json({ message: "Unsupported provider" }, { status: 400 });
  }

  try {
    const calendarSubscriptionService = new CalendarSubscriptionService({
      adapterFactory: new DefaultAdapterFactory(),
      selectedCalendarRepository: new SelectedCalendarRepository(prisma),
      featuresRepository: new FeaturesRepository(prisma),
    });
    await calendarSubscriptionService.processWebhook(provider, {
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
