import type { Params } from "app/_types";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type { CalendarSubscriptionProvider } from "@calcom/features/calendar-subscription/adapters/AdaptersFactory";
import { DefaultAdapterFactory } from "@calcom/features/calendar-subscription/adapters/AdaptersFactory";
import { CalendarSubscriptionService } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionService";
import { CalendarCacheEventRepository } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository";
import { CalendarCacheEventService } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventService";
import { CalendarSyncService } from "@calcom/features/calendar-subscription/lib/sync/CalendarSyncService";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import logger from "@calcom/lib/logger";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { prisma } from "@calcom/prisma";
import { defaultResponderForAppDir } from "@calcom/web/app/api/defaultResponderForAppDir";

const log = logger.getSubLogger({ prefix: ["calendar-webhook"] });

function extractAndValidateProviderFromParams(params: Params): CalendarSubscriptionProvider | null {
  if (!("provider" in params)) {
    return null;
  }
  const { provider } = params;
  if (provider === "google_calendar" || provider === "office365_calendar") {
    return provider;
  }
  return null;
}

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
async function postHandler(request: NextRequest, ctx: { params: Promise<Params> }) {
  const providerFromParams = extractAndValidateProviderFromParams(await ctx.params);
  if (!providerFromParams) {
    return NextResponse.json({ message: "Unsupported provider" }, { status: 400 });
  }

  try {
    // instantiate dependencies
    const bookingRepository = new BookingRepository(prisma);
    const calendarSyncService = new CalendarSyncService({
      bookingRepository,
    });
    const calendarCacheEventRepository = new CalendarCacheEventRepository(prisma);
    const calendarCacheEventService = new CalendarCacheEventService({
      calendarCacheEventRepository,
    });

    const calendarSubscriptionService = new CalendarSubscriptionService({
      adapterFactory: new DefaultAdapterFactory(),
      selectedCalendarRepository: new SelectedCalendarRepository(prisma),
      featuresRepository: new FeaturesRepository(prisma),
      calendarSyncService,
      calendarCacheEventService,
    });

    // are features globally enabled
    const [isCacheEnabled, isSyncEnabled] = await Promise.all([
      calendarSubscriptionService.isCacheEnabled(),
      calendarSubscriptionService.isSyncEnabled(),
    ]);

    if (!isCacheEnabled && !isSyncEnabled) {
      log.debug("No cache or sync enabled");
      return NextResponse.json({ message: "No cache or sync enabled" }, { status: 200 });
    }

    await calendarSubscriptionService.processWebhook(providerFromParams, request);
    return NextResponse.json({ message: "Webhook processed" }, { status: 200 });
  } catch (error) {
    log.error("Error processing webhook", { error });
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export const POST = defaultResponderForAppDir(postHandler);
