import type { NextRequest } from "next/server";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
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
          // FIXME: We need to look into SelectedCalendar table to see if there are already some subscription to same integration and externalCalendarId, we could avoid creating a new channel and reuse that channel.
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

          if (!thirdPartySubscriptionResponse || !thirdPartySubscriptionResponse.subscriptionId) {
            // Handle cases where watch creation didn't return expected data
            log.warn(
              `subscribeToCalendar did not return a valid response or ID for CalendarSubscription ${sub.id}. Response:`,
              safeStringify(thirdPartySubscriptionResponse)
            );
            throw new Error(
              `Failed to create provider subscription for CalendarSubscription ${sub.id}: Invalid response from provider.`
            );
          }

          // Update the CalendarSubscription record to ACTIVE and store provider details
          await prisma.calendarSubscription.update({
            where: { id: sub.id },
            data: {
              // Keep credentialId, externalCalendarId, providerType as they are
              providerSubscriptionId: thirdPartySubscriptionResponse.subscriptionId,
              providerSubscriptionKind: thirdPartySubscriptionResponse.subscriptionKind,
              providerResourceId: thirdPartySubscriptionResponse.resourceId,
              providerResourceUri: thirdPartySubscriptionResponse.resourceUri,
              providerExpiration: thirdPartySubscriptionResponse.expiration
                ? new Date(Number(thirdPartySubscriptionResponse.expiration))
                : null,
              status: "ACTIVE",
            },
          });

          log.debug(
            // Changed to debug to reduce noise for successful operations
            `Successfully ACTIVATED CalendarSubscription ${sub.id} (Provider ID: ${thirdPartySubscriptionResponse.subscriptionId})`
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
