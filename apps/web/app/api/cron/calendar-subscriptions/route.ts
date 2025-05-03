import type { NextRequest } from "next/server";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type { Subscription } from "@calcom/prisma/client";

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
      Subscription,
      "id" | "credentialId" | "externalCalendarId" | "providerType"
    >[] = await prisma.subscription.findMany({
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

          log.debug(`Attempting to CREATE provider subscription for Subscription ${sub.id}`);

          // Create the actual subscription with the provider (e.g., Google Calendar watch)
          const calendarService = await getCalendar(credentialForCalendarCache);
          const watchResponse = await calendarService.watchCalendarCore({
            calendarId: sub.externalCalendarId,
          });

          if (!watchResponse || !watchResponse.id) {
            // Handle cases where watch creation didn't return expected data
            log.warn(
              `watchCalendarCore did not return a valid response or ID for Subscription ${sub.id}. Response:`,
              safeStringify(watchResponse)
            );
            throw new Error(
              `Failed to create provider subscription for Subscription ${sub.id}: Invalid response from provider.`
            );
          }

          // Update the Subscription record to ACTIVE and store provider details
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              // Keep credentialId, externalCalendarId, providerType as they are
              providerSubscriptionId: watchResponse.id,
              providerSubscriptionKind: watchResponse.kind,
              providerResourceId: watchResponse.resourceId,
              providerResourceUri: watchResponse.resourceUri,
              providerExpiration: watchResponse.expiration
                ? new Date(Number(watchResponse.expiration))
                : null,
              providerSyncToken: watchResponse.syncToken,
              status: "ACTIVE",
            },
          });

          log.debug(
            // Changed to debug to reduce noise for successful operations
            `Successfully ACTIVATED Subscription ${sub.id} (Provider ID: ${watchResponse.id})`
          );
        } catch (error) {
          log.error(
            `Error processing Subscription record ID ${sub.id} (credential ${sub.credentialId}, externalId ${sub.externalCalendarId}):`,
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
      message: "Subscription activation batch finished",
      executedAt: new Date().toISOString(),
      success: batchSuccess,
      failures: batchFailures,
      processed: processedCount,
    })
  );
};
