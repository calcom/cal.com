// packages/app-store/office365calendar/api/webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";

import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";

import { getCalendar } from "../../_utils/getCalendar";
import { getWebhookToken } from "../lib/envValidation";
import { webhookPayloadSchema } from "../zod";

const log = logger.getSubLogger({ prefix: ["Office365CalendarWebhook"] });

interface WebhookResponse {
  message: string;
  processed: number;
  failed: number;
  skipped: number;
  errors: string[];
}

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  // Initialize response metrics
  const response: WebhookResponse = {
    message: "ok",
    processed: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  // Parse and validate webhook payload
  let parsedPayload;
  try {
    parsedPayload = webhookPayloadSchema.parse(req.body);
  } catch (err) {
    log.error("Invalid webhook payload", {
      error: err,
      hasBody: !!req.body,
      bodyType: typeof req.body,
    });

    res.status(400).json({
      message: "Invalid webhook payload",
    });
    return;
  }

  // Handle empty notifications
  if (!parsedPayload.value || parsedPayload.value.length === 0) {
    log.info("Webhook received with empty notifications");
    res.json(response);
    return;
  }

  // Track processed subscription IDs to avoid duplicates
  const processedSubscriptionIds = new Set<string>();

  // Track calendars that need cache refresh (all change types)
  const credentialBatches = new Map<number, { calendars: Set<string>; hasDeleted: boolean }>();

  // Process each notification
  for (const notification of parsedPayload.value) {
    const clientState = notification.clientState;
    const subscriptionId = notification.subscriptionId;
    const changeType = notification.changeType;

    log.info(
      "Processing webhook notification",
      safeStringify({
        clientState: clientState ? "SET" : "NOT_SET",
        subscriptionId,
        changeType,
        resource: notification.resource,
      })
    );

    // Validate clientState
    if (clientState && clientState !== getWebhookToken()) {
      response.skipped++;
      response.errors.push(`Invalid clientState for subscription ${subscriptionId}`);
      continue;
    }

    // Check for duplicate subscription IDs
    if (processedSubscriptionIds.has(subscriptionId)) {
      response.skipped++;
      response.errors.push(`Duplicate subscriptionId ${subscriptionId}`);
      continue;
    }

    try {
      // Find all calendars using this subscription
      const selectedCalendars = await SelectedCalendarRepository.findManyByOutlookSubscriptionIds([
        subscriptionId,
      ]);

      if (selectedCalendars.length === 0) {
        response.skipped++;
        response.errors.push(`No SelectedCalendar found for subscription ${subscriptionId}`);
        continue;
      }

      // Group calendars by credential and change type for proper cache handling
      for (const calendar of selectedCalendars) {
        if (!calendar.credential) {
          response.skipped++;
          response.errors.push(`No credential found for subscription ${subscriptionId}`);
          continue;
        }

        const credentialId = calendar.credential.id;

        // All change types need cache refresh, just track if any are deletions
        if (!credentialBatches.has(credentialId)) {
          credentialBatches.set(credentialId, { calendars: new Set(), hasDeleted: false });
        }

        const batch = credentialBatches.get(credentialId);
        if (!batch) continue;
        batch.calendars.add(calendar.externalId);

        if (changeType === "deleted") {
          batch.hasDeleted = true;
          // 🔵 DEBUG: Detailed info with sensitive calendar ID
          log.debug("Marked calendar for cache refresh due to deleted event", {
            credentialId,
            calendarId: calendar.externalId,
            subscriptionId,
          });
          log.info("Marked calendar for cache refresh due to deleted event");
        } else if (changeType === "created") {
          // 🔵 DEBUG: Detailed info with sensitive calendar ID
          log.debug("Marked calendar for cache refresh due to created event", {
            credentialId,
            calendarId: calendar.externalId,
            subscriptionId,
          });
          log.info("Marked calendar for cache refresh due to created event");
        } else if (changeType === "updated") {
          // 🔵 DEBUG: Detailed info with sensitive calendar ID
          log.debug("Marked calendar for cache refresh due to updated event", {
            credentialId,
            calendarId: calendar.externalId,
            subscriptionId,
          });
          log.info("Marked calendar for cache refresh due to updated event");
        }
      }

      processedSubscriptionIds.add(subscriptionId);
    } catch (error) {
      response.failed++;
      response.errors.push(`Failed to process subscription ${subscriptionId}: ${error}`);
      log.error("Error processing subscription", { subscriptionId, error });
    }
  }

  // Process all calendar cache updates in a single loop
  for (const [credentialId, batch] of Array.from(credentialBatches.entries())) {
    try {
      const credentialForCalendarCache = await getCredentialForCalendarCache({ credentialId });
      if (!credentialForCalendarCache) {
        response.failed++;
        response.errors.push(`Failed to get credential for cache: ${credentialId}`);
        continue;
      }

      const calendarService = await getCalendar(credentialForCalendarCache);
      if (!calendarService) {
        response.failed++;
        response.errors.push(`Failed to get calendar service for credential: ${credentialId}`);
        continue;
      }

      const calendarsToUpdate = Array.from(batch.calendars).map((externalId) => ({
        externalId,
        integration: "office365_calendar",
      }));

      if (calendarService.fetchAvailabilityAndSetCache) {
        const actionType = batch.hasDeleted ? "refresh (includes deleted events)" : "update";

        log.debug(`Calling fetchAvailabilityAndSetCache to ${actionType}`, {
          credentialId,
          calendarsCount: calendarsToUpdate.length,
          calendarIds: calendarsToUpdate.map((c) => c.externalId),
          hasDeleted: batch.hasDeleted,
        });

        log.info(`Calling fetchAvailabilityAndSetCache to ${actionType}`, {
          credentialId,
          calendarsCount: calendarsToUpdate.length,
          hasDeleted: batch.hasDeleted,
        });

        await calendarService.fetchAvailabilityAndSetCache(calendarsToUpdate);
        response.processed += calendarsToUpdate.length;

        log.info(`Successfully completed calendar cache ${actionType}`, {
          processedCount: calendarsToUpdate.length,
          hasDeleted: batch.hasDeleted,
        });
      } else {
        response.failed++;
        response.errors.push(
          `Calendar service missing fetchAvailabilityAndSetCache method for credential ${credentialId}`
        );
        log.error("Calendar service missing fetchAvailabilityAndSetCache method", { credentialId });
      }
    } catch (error) {
      response.failed++;
      response.errors.push(`Failed to update cache for credential ${credentialId}: ${error}`);
      log.error("Error updating calendar cache", { credentialId, error });
    }
  }

  log.info("Webhook processing completed", safeStringify(response));
  res.json(response);
}

// Main handler function that uses NextJS body parsing
async function webhookHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    return postHandler(req, res);
  } else if (req.method === "GET") {
    // GET requests - webhook status
    res.status(200).json({
      message: "Office 365 Calendar Webhook endpoint is active",
    });
    return;
  } else {
    res.setHeader("Allow", ["POST", "GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle validation token immediately - this is checked before body parsing affects performance
  if (req.query.validationToken) {
    const validationToken = req.query.validationToken as string;

    log.info("Validation request received, responding immediately.", {
      method: req.method,
      validationToken: "[REDACTED]",
    });

    return res.status(200).send(validationToken);
  }

  // For non-validation requests, use the main webhook handler
  try {
    await webhookHandler(req, res);
  } catch (error) {
    // Ensure we don't accidentally log sensitive query params in error logs
    log.error("Webhook handler error", {
      method: req.method,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ message: "Internal server error" });
  }
}

// Conditional body parsing: Disable for validation requests, enable for webhook POST
// 📝 NOTE: Function-based bodyParser is a valid Next.js feature for conditional parsing
// This prevents timeout issues during webhook validation by skipping unnecessary body parsing
export const config = {
  api: {
    bodyParser: (req: NextApiRequest) => {
      // Disable body parsing for validation requests (they only need query params)
      if (req.query?.validationToken) {
        return false;
      }
      // Enable body parsing for actual webhook POST requests
      return true;
    },
  },
};
