import type { NextRequest } from "next/server";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { CalendarSubscriptionService } from "@calcom/features/calendar-sync/calendarSubscription.service";
import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type { CalendarSubscription } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["[cron/subscription-cron]"] });
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

  let batchSuccess = 0;
  let batchFailures = 0;
  let processedCount = 0;

  try {
    // Fetch ONE batch of PENDING Subscriptions
    const pendingSubscriptions: Pick<
      CalendarSubscription,
      "id" | "credentialId" | "externalCalendarId" | "providerType"
    >[] = await prisma.calendarSubscription.findMany({
      take: BATCH_SIZE,
      where: {
        status: "PENDING",
      },
      select: {
        id: true,
        credentialId: true,
        externalCalendarId: true,
        providerType: true,
      },
      orderBy: {
        id: "asc", // Consistent ordering
      },
    });

    processedCount = pendingSubscriptions.length;

    if (processedCount === 0) {
      log.info("No PENDING subscriptions found in this run.");
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

    log.info(`Found ${processedCount} PENDING subscriptions. Processing batch...`);

    const results = await Promise.allSettled(
      pendingSubscriptions.map(async (sub) => {
        try {
          // First, check if there's already an existing subscription in SelectedCalendar we can reuse
          const existingSubscription = await CalendarSubscriptionService.findExistingProviderSubscription({
            externalCalendarId: sub.externalCalendarId,
            integration: sub.providerType,
          });

          if (existingSubscription?.fromSelectedCalendar) {
            log.info(
              `Found existing SelectedCalendar subscription for CalendarSubscription ${sub.id}. Reusing it.`,
              safeStringify({
                selectedCalendarId: sub.id,
              })
            );

            // Use the service to activate the subscription from SelectedCalendar data
            await CalendarSubscriptionService.activateSubscription({
              subscriptionId: sub.id,
              providerDetails: existingSubscription.providerDetails,
            });

            log.debug(
              `Successfully ACTIVATED CalendarSubscription ${sub.id} using existing SelectedCalendar subscription`
            );
            return;
          }

          const credentialForCalendarCache = await getCredentialForCalendarCache({
            credentialId: sub.credentialId,
          });

          log.debug(`Attempting to CREATE provider subscription for CalendarSubscription ${sub.id}`);

          // Create the actual subscription with the provider (e.g., Google Calendar watch)
          const calendarService = await getCalendar(credentialForCalendarCache);
          if (!calendarService) {
            log.error(
              `Calendar service not found for CalendarSubscription ${sub.id} (credential ${sub.credentialId}, externalId ${sub.externalCalendarId})`
            );
            throw new Error("CalendarService couldn't be initialized");
          }

          if (!calendarService.subscribeToCalendar) {
            log.error(
              `subscribeToCalendar is not implemented for CalendarSubscription ${sub.id} (credential ${sub.credentialId}, externalId ${sub.externalCalendarId})`
            );
            throw new Error("subscribeToCalendar is not implemented");
          }

          const thirdPartySubscriptionResponse = await calendarService.subscribeToCalendar({
            calendarId: sub.externalCalendarId,
          });

          if (!thirdPartySubscriptionResponse || !thirdPartySubscriptionResponse.id) {
            // Handle cases where watch creation didn't return expected data
            log.warn(
              `subscribeToCalendar did not return a valid response or ID for CalendarSubscription ${sub.id}. Response:`,
              safeStringify(thirdPartySubscriptionResponse)
            );
            throw new Error(
              `Failed to create provider subscription for CalendarSubscription ${sub.id}: Invalid response from provider.`
            );
          }

          // Update the subscription to ACTIVE using our service
          await CalendarSubscriptionService.activateSubscription({
            subscriptionId: sub.id,
            providerDetails: thirdPartySubscriptionResponse,
          });

          log.debug(
            `Successfully ACTIVATED CalendarSubscription ${sub.id} (Provider ID: ${thirdPartySubscriptionResponse.id})`
          );
        } catch (error) {
          log.error(
            `Error processing CalendarSubscription record ID ${sub.id} (credential ${sub.credentialId}, externalId ${sub.externalCalendarId}):`,
            safeStringify(error)
          );
          // Let the status remain PENDING for retry on next run
          throw error; // Re-throw to mark the promise as rejected
        }
      })
    );

    // Calculate results for this batch
    batchSuccess = results.filter((r) => r.status === "fulfilled").length;
    batchFailures = results.filter((r) => r.status === "rejected").length;

    log.info(
      `Batch finished. Processed: ${processedCount}, Success: ${batchSuccess}, Failures: ${batchFailures}.`
    );
  } catch (error) {
    log.error("Unhandled error during subscription activation batch processing:", safeStringify(error));
    // If a major error occurs (e.g., DB connection), report it
    batchFailures = processedCount - batchSuccess; // Estimate failures
    return new Response(
      JSON.stringify({
        message: "Error during batch processing.",
        error: safeStringify(error),
        executedAt: new Date().toISOString(),
        success: batchSuccess,
        failures: batchFailures,
        processed: processedCount,
      }),
      { status: 500 }
    );
  }

  log.info(
    `Completed cron run for subscription activation. Processed: ${processedCount}, Success: ${batchSuccess}, Failures: ${batchFailures}`
  );

  return new Response(
    JSON.stringify({
      message: "CalendarSubscription activation batch finished",
      executedAt: new Date().toISOString(),
      success: batchSuccess,
      failures: batchFailures,
      processed: processedCount,
    })
  );
};
