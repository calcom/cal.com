/**
 * This cron job is used to create a subscription for a CalendarSync record.
 */
import type { NextRequest } from "next/server";

import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type { CalendarSync } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["[cron/bi-directional-calendar-sync]"] });
const BATCH_SIZE = 100; // Process up to 100 records per run

const validateRequest = (req: NextRequest) => {
  const url = new URL(req.url);
  const apiKey = req.headers.get("authorization") || url.searchParams.get("apiKey");
  if (!apiKey || ![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(apiKey)) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }
};

export const GET = async (req: Request) => {
  try {
    validateRequest(req as NextRequest);
  } catch (error) {
    log.error("Cron Authentication failed", error);
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  const batchProcessed = 0;
  let batchSuccess = 0;
  let batchFailures = 0;

  try {
    // Fetch ONE batch of CalendarSync records needing a subscription
    const syncedCalendarsToProcess: Pick<
      CalendarSync,
      "id" | "credentialId" | "externalCalendarId" | "integration"
    >[] = await prisma.calendarSync.findMany({
      take: BATCH_SIZE,
      where: {
        subscriptionId: null, // Only fetch records without a subscription
      },
      select: {
        id: true, // Need ID for update
        credentialId: true,
        externalCalendarId: true,
        integration: true, // Needed for providerType
      },
      orderBy: {
        id: "asc", // Consistent ordering ensures we process oldest first
      },
    });

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
        // Ensure essential data exists
        if (!syncedCal.credentialId || !syncedCal.externalCalendarId) {
          log.warn(
            `Skipping CalendarSync record ID ${syncedCal.id} due to missing credentialId or externalCalendarId:`,
            safeStringify(syncedCal)
          );
          // Throw error to mark as failed in Promise.allSettled
          throw new Error(
            `Missing credentialId or externalCalendarId in CalendarSync record ID ${syncedCal.id}`
          );
        }

        try {
          // Directly create a PENDING subscription
          const newSubscription = await prisma.subscription.create({
            data: {
              credentialId: syncedCal.credentialId,
              externalCalendarId: syncedCal.externalCalendarId,
              providerType: syncedCal.integration,
              status: "PENDING",
            },
            select: { id: true }, // Select only needed ID
          });

          // Link the new subscription back to the CalendarSync record
          await prisma.calendarSync.update({
            where: { id: syncedCal.id }, // Use the CalendarSync ID
            data: { subscriptionId: newSubscription.id },
          });

          log.debug(
            // Changed to debug to reduce noise for successful operations
            `Created PENDING Subscription ${newSubscription.id} and linked to SyncedCalendar ${syncedCal.id}`
          );
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
