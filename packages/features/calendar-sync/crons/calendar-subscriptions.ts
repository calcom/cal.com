/**
 * This cron is responsible to manage the subscriptions with all the third party providers
 */
import type { NextRequest } from "next/server";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { CalendarSubscriptionService } from "@calcom/features/calendar-sync/calendarSubscription.service";
import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
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

/**
 * Attempts to reuse an existing active provider subscription from SelectedCalendar
 * Returns true if successfully reused, false if no existing subscription found
 */
const tryReuseExistingSubscription = async (
  subscription: Pick<CalendarSubscription, "id" | "externalCalendarId" | "providerType">
): Promise<boolean> => {
  const existingSubscription =
    await CalendarSubscriptionService.findActiveProviderSubscriptionInSelectedCalendarToo({
      externalCalendarId: subscription.externalCalendarId,
      integration: subscription.providerType,
    });

  if (existingSubscription?.fromSelectedCalendar) {
    log.info(
      `Found existing SelectedCalendar subscription for CalendarSubscription ${subscription.id}. Reusing it.`,
      safeStringify({
        selectedCalendarId: subscription.id,
      })
    );

    // Use the service to activate the subscription from SelectedCalendar data
    await CalendarSubscriptionService.activateSubscription({
      subscriptionId: subscription.id,
      providerDetails: existingSubscription.providerDetails,
    });

    log.debug(
      `Successfully ACTIVATED CalendarSubscription ${subscription.id} using existing SelectedCalendar subscription`
    );
    return true;
  }

  return false;
};

/**
 * Creates or renews a subscription with the third-party calendar provider
 */
const createOrRenewThirdPartySubscription = async (
  subscription: Pick<
    CalendarSubscription,
    "id" | "credentialId" | "externalCalendarId" | "status" | "providerSubscriptionId" | "providerResourceId"
  >
): Promise<void> => {
  const isRenewal = subscription.status === "ACTIVE";
  const logPrefix = isRenewal ? "RENEW" : "ACTIVATE";

  const credentialForCalendarCache = await getCredentialForCalendarCache({
    credentialId: subscription.credentialId,
  });

  log.debug(`Attempting to ${logPrefix} subscription for CalendarSubscription ${subscription.id}`);

  // Create or renew the subscription with the provider (e.g., Google Calendar watch)
  const calendarService = await getCalendar(credentialForCalendarCache);
  if (!calendarService) {
    log.error(
      `Calendar service not found for CalendarSubscription ${subscription.id} (credential ${subscription.credentialId}, externalId ${subscription.externalCalendarId})`
    );
    throw new Error("CalendarService couldn't be initialized");
  }

  if (!calendarService.subscribeToCalendar) {
    log.error(
      `subscribeToCalendar is not implemented for CalendarSubscription ${subscription.id} (credential ${subscription.credentialId}, externalId ${subscription.externalCalendarId})`
    );
    throw new Error("subscribeToCalendar is not implemented");
  }

  const thirdPartySubscriptionResponse = await calendarService.subscribeToCalendar({
    calendarId: subscription.externalCalendarId,
  });

  if (!thirdPartySubscriptionResponse || !thirdPartySubscriptionResponse.id) {
    // Handle cases where watch creation didn't return expected data
    log.warn(
      `subscribeToCalendar did not return a valid response or ID for CalendarSubscription ${subscription.id}. Response:`,
      safeStringify(thirdPartySubscriptionResponse)
    );
    throw new Error(
      `Failed to ${logPrefix.toLowerCase()} subscription for CalendarSubscription ${
        subscription.id
      }: Invalid response from provider.`
    );
  }

  if (isRenewal && subscription.providerSubscriptionId && subscription.providerResourceId) {
    try {
      // Unsubscribe from the old subscription as it might still receive webhooks for some time causing duplicate webhook events
      await calendarService.unsubscribeFromCalendar?.({
        providerSubscriptionId: subscription.providerSubscriptionId,
        providerResourceId: subscription.providerResourceId,
      });
    } catch (error) {
      // We are okay if we are unable to unsubscribe from the old subscription as it was about to expire anyway
      log.warn(
        `Error unsubscribing from CalendarSubscription ${subscription.id} (credential ${subscription.credentialId}, externalId ${subscription.externalCalendarId}):`,
        safeStringify(error)
      );
    }
  }

  // Update the subscription to ACTIVE using our service
  await CalendarSubscriptionService.activateSubscription({
    subscriptionId: subscription.id,
    providerDetails: thirdPartySubscriptionResponse,
  });

  log.debug(
    `Successfully ${isRenewal ? "RENEWED" : "ACTIVATED"} CalendarSubscription ${
      subscription.id
    } (Provider ID: ${thirdPartySubscriptionResponse.id})`
  );
};

/**
 * Processes a single calendar subscription
 * Handles both new subscriptions and renewals
 */
const processSubscription = async (
  subscription: Pick<
    CalendarSubscription,
    | "id"
    | "credentialId"
    | "externalCalendarId"
    | "providerType"
    | "status"
    | "providerSubscriptionId"
    | "providerResourceId"
  >
) => {
  const isRenewal = subscription.status === "ACTIVE";

  if (!isRenewal) {
    // See if we have active subscription from SelectedCalendar that we can reuse
    const reused = await tryReuseExistingSubscription(subscription);
    if (reused) {
      return;
    }
  }

  // If we can't reuse an existing subscription, create or renew one with the provider
  await createOrRenewThirdPartySubscription(subscription);
};

export const GET = async (req: Request) => {
  try {
    validateRequest(req as NextRequest);
  } catch (error) {
    log.error("Cron Authentication failed", error);
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  let successCount = 0;
  let failureCount = 0;
  let processedCount = 0;
  try {
    const subscriptionsToProcess = await CalendarSubscriptionService.findAllRequiringRenewalOrActivation({
      batchSize: BATCH_SIZE,
    });

    processedCount = subscriptionsToProcess.length;

    if (!subscriptionsToProcess.length) {
      log.info("No subscriptions need processing in this run.");
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

    const pendingCount = subscriptionsToProcess.filter((sub) => sub.status === "PENDING").length;
    const renewalCount = processedCount - pendingCount;

    log.info(
      `Found ${processedCount} subscriptions to process: ${pendingCount} new and ${renewalCount} renewals. Processing batch...`
    );

    const results = await Promise.allSettled(
      subscriptionsToProcess.map(async (subscription) => {
        try {
          // TODO: Bulk subscriptions should be done. Google Calendar API supports it.
          await processSubscription(subscription);
        } catch (error) {
          log.error(
            `Error processing CalendarSubscription record ID ${subscription.id} (credential ${subscription.credentialId}, externalId ${subscription.externalCalendarId}):`,
            safeStringify(error)
          );
          throw error; // Re-throw to mark the promise as rejected
        }
      })
    );

    // Calculate results
    successCount = results.filter((r) => r.status === "fulfilled").length;
    failureCount = results.filter((r) => r.status === "rejected").length;

    log.info(
      `Batch finished. Processed: ${processedCount} (${pendingCount} new, ${renewalCount} renewals), Success: ${successCount}, Failures: ${failureCount}.`
    );
  } catch (error) {
    log.error("Unhandled error during subscription processing:", safeStringify(error));
    // If a major error occurs (e.g., DB connection), report it
    failureCount = processedCount - successCount; // Estimate failures
    return new Response(
      JSON.stringify({
        message: "Error during subscription processing.",
        error: safeStringify(error),
        executedAt: new Date().toISOString(),
        success: successCount,
        failures: failureCount,
        processed: processedCount,
      }),
      { status: 500 }
    );
  }

  log.info(
    `Completed cron run. Processed: ${processedCount}, Success: ${successCount}, Failures: ${failureCount}`
  );

  return new Response(
    JSON.stringify({
      message: "CalendarSubscription processing finished",
      executedAt: new Date().toISOString(),
      success: successCount,
      failures: failureCount,
      processed: processedCount,
    })
  );
};
