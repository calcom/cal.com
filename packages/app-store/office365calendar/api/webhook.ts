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

// Parse the calendarId from the resource field (e.g., "me/calendars/<calendarId>/events/<eventId>")
function parseCalendarId(resource: string): string | null {
  const match = RegExp(/calendars\/([^/]+)\/events/).exec(resource);
  return match ? match[1] : null;
}

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

  // Validate clientState for each notification
  const validNotifications = payload.value.filter((notification) => {
    if (notification.clientState && notification.clientState !== process.env.MICROSOFT_WEBHOOK_TOKEN) {
      log.warn("Invalid clientState", { subscriptionId: notification.subscriptionId });
      results.skipped++;
      results.errors.push(`Invalid clientState for subscription ${notification.subscriptionId}`);
      return false;
    }
    return true;
  });

  if (validNotifications.length === 0) {
    log.warn("No valid notifications to process", { results });
    return { message: "ok", ...results };
  }

  // Batch fetch SelectedCalendar records for all subscriptionIds
  const subscriptionIds = validNotifications.map((n) => n.subscriptionId);
  const selectedCalendars = await SelectedCalendarRepository.findManyByOutlookSubscriptionIds(
    subscriptionIds
  );

  // Map subscriptionId to SelectedCalendar for efficient lookup
  const calendarMap = new Map(selectedCalendars.map((cal) => [cal.outlookSubscriptionId, cal]));

  // Group notifications by credentialId for batch cache updates
  const notificationsByCredential = new Map<
    number,
    {
      notification: z.infer<typeof webhookPayloadSchema>["value"][0];
      calendar: (typeof selectedCalendars)[0];
    }[]
  >();

  for (const notification of validNotifications) {
    const calendar = calendarMap.get(notification.subscriptionId);
    if (!calendar) {
      log.warn("No SelectedCalendar found for subscription", { subscriptionId: notification.subscriptionId });
      results.skipped++;
      results.errors.push(`No SelectedCalendar found for subscription ${notification.subscriptionId}`);
      continue;
    }

    if (!calendar.credential) {
      log.warn("No credential found for SelectedCalendar", { subscriptionId: notification.subscriptionId });
      results.skipped++;
      results.errors.push(`No credential found for subscription ${notification.subscriptionId}`);
      continue;
    }

    // Extract calendarId from resource (fallback to calendar.externalId if parsing fails)
    const calendarId = parseCalendarId(notification.resource) ?? calendar.externalId;

    // Ensure the calendarId matches a SelectedCalendar
    if (calendarId !== calendar.externalId) {
      log.warn("Parsed calendarId does not match SelectedCalendar", {
        subscriptionId: notification.subscriptionId,
        parsedCalendarId: calendarId,
        selectedCalendarId: calendar.externalId,
      });
      results.skipped++;
      results.errors.push(
        `Parsed calendarId ${calendarId} does not match SelectedCalendar ${calendar.externalId} for subscription ${notification.subscriptionId}`
      );
      continue;
    }

    const credentialId = calendar.credential.id;
    if (!notificationsByCredential.has(credentialId)) {
      notificationsByCredential.set(credentialId, []);
    }
    notificationsByCredential.get(credentialId)?.push({ notification, calendar });
  }

  // Process cache updates for each credential in parallel
  await Promise.all(
    Array.from(notificationsByCredential.entries()).map(async ([credentialId, items]) => {
      try {
        const credential = await getCredentialForCalendarCache({ credentialId });
        const calendarService = await getCalendar(credential);

        // Extract unique calendar IDs affected by notifications
        const affectedCalendarIds = new Set(items.map(({ calendar }) => calendar.externalId));

        // Filter selectedCalendars to include only affected calendars
        const calendarsToUpdate = items[0].calendar.credential?.selectedCalendars.filter((cal) =>
          affectedCalendarIds.has(cal.externalId)
        );

        if (!calendarsToUpdate || calendarsToUpdate.length === 0) {
          log.warn("No calendars to update for credential", { credentialId });
          results.skipped += items.length;
          return;
        }

        // Update cache for affected calendars
        await calendarService?.fetchAvailabilityAndSetCache?.(calendarsToUpdate);
        results.processed += items.length;
        log.debug("Updated cache for credential", {
          credentialId,
          calendarIds: Array.from(affectedCalendarIds),
          count: items.length,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        log.error("Failed to update cache for credential", {
          credentialId,
          error: errorMessage,
        });
        results.failed += items.length;
        results.errors.push(`Failed to update cache for credential ${credentialId}: ${errorMessage}`);
      }
    })
  );

  log.info("Completed processing notifications", results);
  return { message: "ok", ...results };
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
