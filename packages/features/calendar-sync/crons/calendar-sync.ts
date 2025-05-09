/**
 * This cron job is used to create a subscription for a CalendarSync record.
 */
import type { NextRequest } from "next/server";

import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { CalendarSync } from "@calcom/prisma/client";

import { CalendarSubscriptionService } from "../calendarSubscription.service";
import { CalendarSyncRepository } from "../calendarSync.repository";

const log = logger.getSubLogger({ prefix: ["[cron/bi-directional-calendar-sync]"] });
const BATCH_SIZE = 100; // Process up to 100 records per run

const validateRequest = (req: NextRequest) => {
  const url = new URL(req.url);
  const apiKey = req.headers.get("authorization") || url.searchParams.get("apiKey");
  if (!apiKey || ![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(apiKey)) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }
};

/**
 * Links an existing subscription to a CalendarSync record
 */
const linkExistingSubscription = async (
  calendarSync: Pick<CalendarSync, "id" | "externalCalendarId" | "integration">
): Promise<boolean> => {
  const existingSubscription = await CalendarSubscriptionService.findbyExternalIdAndIntegration({
    externalId: calendarSync.externalCalendarId,
    integration: calendarSync.integration,
  });

  if (existingSubscription) {
    // Link the existing subscription to the CalendarSync record
    await CalendarSubscriptionService.linkCalendarSyncToSubscription({
      calendarSyncId: calendarSync.id,
      subscriptionId: existingSubscription.id,
    });

    log.debug(
      `Linked existing CalendarSubscription ${existingSubscription.id} to CalendarSync ${calendarSync.id}`
    );
    return true;
  }

  return false;
};

/**
 * Creates a new pending subscription and links it to a CalendarSync record
 */
const createAndLinkNewSubscription = async (
  calendarSync: Pick<CalendarSync, "id" | "credentialId" | "externalCalendarId" | "integration">
): Promise<void> => {
  const newSubscription = await CalendarSubscriptionService.createPendingSubscription({
    credentialId: calendarSync.credentialId,
    externalCalendarId: calendarSync.externalCalendarId,
    integration: calendarSync.integration,
  });

  // Link the new subscription to the CalendarSync record
  await CalendarSubscriptionService.linkCalendarSyncToSubscription({
    calendarSyncId: calendarSync.id,
    subscriptionId: newSubscription.id,
  });

  log.debug(
    `Created PENDING CalendarSubscription ${newSubscription.id} and linked to CalendarSync ${calendarSync.id}`
  );
};

/**
 * Process a single CalendarSync record
 */
const processCalendarSync = async (
  calendarSync: Pick<CalendarSync, "id" | "credentialId" | "externalCalendarId" | "integration">
): Promise<void> => {
  // Ensure essential data exists
  if (!calendarSync.credentialId || !calendarSync.externalCalendarId) {
    log.warn(
      `Skipping CalendarSync record ID ${calendarSync.id} due to missing credentialId or externalCalendarId:`,
      safeStringify(calendarSync)
    );
    throw new Error(
      `Missing credentialId or externalCalendarId in CalendarSync record ID ${calendarSync.id}`
    );
  }

  // First try to find and link an existing subscription
  const linkedExisting = await linkExistingSubscription(calendarSync);

  // If no existing subscription was found, create a new one
  if (!linkedExisting) {
    await createAndLinkNewSubscription(calendarSync);
  }
};

export const GET = async (req: Request) => {
  try {
    validateRequest(req as NextRequest);
  } catch (error) {
    log.error("Cron Authentication failed", error);
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  let batchProcessed = 0;
  let batchSuccess = 0;
  let batchFailures = 0;

  try {
    // Fetch ONE batch of CalendarSync records needing a subscription
    const syncedCalendarsToProcess = await CalendarSyncRepository.findManyRequiringSubscription({
      batchSize: BATCH_SIZE,
    });

    batchProcessed = syncedCalendarsToProcess.length;

    if (syncedCalendarsToProcess.length === 0) {
      log.info("No CalendarSync records found needing subscriptions in this run.");
      // Return success, indicating nothing needed to be done
      return new Response(
        JSON.stringify({
          message: "No records needed processing in this run.",
          executedAt: new Date().toISOString(),
          success: 0,
          failures: 0,
          processed: 0,
        })
      );
    }

    log.info(
      `Found ${syncedCalendarsToProcess.length} CalendarSync records needing subscriptions. Processing batch...`
    );

    const results = await Promise.allSettled(
      syncedCalendarsToProcess.map(async (syncedCal) => {
        try {
          await processCalendarSync(syncedCal);
        } catch (error) {
          log.error(
            `Error processing CalendarSync record ID ${syncedCal.id} (credential ${syncedCal.credentialId}, externalId ${syncedCal.externalCalendarId}):`,
            safeStringify(error)
          );
          throw error; // Re-throw to mark the promise as rejected
        }
      })
    );

    // Calculate results for this batch
    batchSuccess = results.filter((r) => r.status === "fulfilled").length;
    batchFailures = results.filter((r) => r.status === "rejected").length;

    log.info(
      `Batch finished. Processed: ${batchProcessed}, Success: ${batchSuccess}, Failures: ${batchFailures}.`
    );

    // Note: No cursor update needed here as we rely on the next cron run
    // to pick up where this one left off based on subscriptionId being null.
  } catch (error) {
    log.error("Unhandled error during subscription creation batch processing:", safeStringify(error));
    // If a major error occurs (e.g., DB connection), report it
    // We don't know exact failures, report processed as 0 or be cautious
    batchFailures = batchProcessed - batchSuccess; // Estimate failures
    return new Response(
      JSON.stringify({
        message: "Error during batch processing.",
        error: safeStringify(error),
        executedAt: new Date().toISOString(),
        success: batchSuccess, // Report successes up to the error point
        failures: batchFailures, // Report estimated failures
        processed: batchProcessed,
      }),
      { status: 500 } // Indicate server error
    );
  }

  log.info(
    `Completed cron run for subscription creation. Processed: ${batchProcessed}, Success: ${batchSuccess}, Failures: ${batchFailures}`
  );

  // Return final summary for this run
  return new Response(
    JSON.stringify({
      message: "Bi-directional sync batch finished",
      executedAt: new Date().toISOString(),
      success: batchSuccess,
      failures: batchFailures,
      processed: batchProcessed,
    })
  );
};
