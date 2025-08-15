import type { NextApiRequest, NextApiResponse } from "next";
import type { z } from "zod";

import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";

import { getCalendar } from "../../_utils/getCalendar";
import { webhookPayloadSchema } from "../zod";

const log = logger.getSubLogger({ prefix: ["Office365CalendarWebhook"] });

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  // Handle Microsoft Graph validation request
  const validationToken = req.query.validationToken;
  if (validationToken) {
    res.setHeader("Content-Type", "text/plain");
    res.send(validationToken);
    return;
  }

  // Parse and validate the webhook payload
  let payload: z.infer<typeof webhookPayloadSchema>;
  try {
    payload = webhookPayloadSchema.parse(req.body);
  } catch (error) {
    log.error("Failed to parse webhook payload", { error: safeStringify(error) });
    throw new HttpError({ statusCode: 400, message: "Invalid webhook payload" });
  }

  if (payload.value.length === 0) {
    log.debug("Received empty notification payload");
    return { message: "ok", processed: 0, failed: 0, skipped: 0, errors: [] };
  }

  log.debug("Processing notifications", { count: payload.value.length });

  // Track processing results
  const results = {
    processed: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  const webhookToken = process.env.MICROSOFT_WEBHOOK_TOKEN;
  if (!webhookToken) {
    log.error("MICROSOFT_WEBHOOK_TOKEN is not defined");
    return {
      message: "ok",
      processed: 0,
      failed: 0,
      skipped: payload.value.length,
      errors: ["MICROSOFT_WEBHOOK_TOKEN is not defined"],
    };
  }

  // Validate clientState for each notification
  const seenSubscriptionIds = new Set<string>();
  const validNotifications = payload.value.filter((notification) => {
    if (!notification.clientState || notification.clientState !== webhookToken) {
      results.skipped++;
      results.errors.push(`Invalid or missing clientState for subscription ${notification.subscriptionId}`);
      return false;
    }
    if (seenSubscriptionIds.has(notification.subscriptionId)) {
      log.debug("Duplicate subscriptionId detected", { subscriptionId: notification.subscriptionId });
      results.skipped++;
      results.errors.push(`Duplicate subscriptionId ${notification.subscriptionId}`);
      return false;
    }
    seenSubscriptionIds.add(notification.subscriptionId);
    return true;
  });

  if (validNotifications.length === 0) {
    log.warn("No valid notifications to process", { results });
    return { message: "ok", ...results };
  }

  // Fetch SelectedCalendars for all subscriptionIds
  // FindMany avoids pinging prisma (db) each time inside the below for loop
  const allSelectedCalendars = await SelectedCalendarRepository.findManyByOutlookSubscriptionIds(
    Array.from(seenSubscriptionIds)
  );

  // Process notifications in parallel
  await Promise.all(
    validNotifications.map(async (notification) => {
      const selectedCalendar = allSelectedCalendars.find(
        (cal) => cal.outlookSubscriptionId === notification.subscriptionId
      );
      if (!selectedCalendar) {
        log.warn("No SelectedCalendar found for subscription", {
          subscriptionId: notification.subscriptionId,
        });
        results.skipped++;
        results.errors.push(`No SelectedCalendar found for subscription ${notification.subscriptionId}`);
        return;
      }

      const { credential } = selectedCalendar;
      if (!credential) {
        log.warn("No credential found for SelectedCalendar", { subscriptionId: notification.subscriptionId });
        results.skipped++;
        results.errors.push(`No credential found for subscription ${notification.subscriptionId}`);
        return;
      }

      // Process cache update
      try {
        const { selectedCalendars } = credential;
        const credentialForCalendarCache = await getCredentialForCalendarCache({
          credentialId: credential.id,
        });
        const calendarService = await getCalendar(credentialForCalendarCache);

        await calendarService?.fetchAvailabilityAndSetCache?.(selectedCalendars);
        results.processed++;
        log.debug("Updated cache for credential", {
          credentialId: credential.id,
          calendarId: selectedCalendar.id,
          subscriptionId: notification.subscriptionId,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        log.error("Failed to update cache for credential", {
          credentialId: credential.id,
          subscriptionId: notification.subscriptionId,
          error: errorMessage,
        });
        results.failed++;
        results.errors.push(`Failed to update cache for credential ${credential.id}: ${errorMessage}`);
      }
    })
  );

  log.info("Completed processing notifications", results);
  return { message: "ok", ...results };
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
