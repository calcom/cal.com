import type { NextApiRequest, NextApiResponse } from "next";

import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";

import { getCalendar } from "../../_utils/getCalendar";

const log = logger.getSubLogger({ prefix: ["Office365CalendarWebhook"] });

/**
 * GET handler for Microsoft Graph subscription validation
 * This is used to validate the subscription with Microsoft Graph
 * It returns the validation token as plain text
 */
async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const validationToken = req.query.validationToken;

  if (!validationToken || typeof validationToken !== "string") {
    throw new HttpError({ statusCode: 400, message: "Missing validation token" });
  }

  // Send as plain text directly - this is what Microsoft Graph expects
  res.setHeader("Content-Type", "text/plain");
  res.status(200).send(validationToken);
}

/**
 * POST handler for Microsoft Graph webhook notifications
 * This is used to process the notifications received from Microsoft Graph
 * It validates the client state and processes the notifications
 */
async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  // Check if this is a validation request (has validationToken in query)
  const validationToken = req.query.validationToken;

  if (validationToken && typeof validationToken === "string") {
    // This is a validation request from Microsoft Graph
    log.debug("Validation request received", safeStringify({ validationToken }));

    // Send as plain text directly - this is what Microsoft Graph expects
    res.setHeader("Content-Type", "text/plain");
    res.status(200).send(validationToken);
    return;
  }

  // This is a regular notification
  const clientState = req.headers["x-microsoft-client-state"];

  log.debug(
    "Webhook notification received",
    safeStringify({
      clientState,
      body: req.body,
    })
  );

  // Only validate client state for actual notifications, not validation requests
  if (
    req.body?.value &&
    process.env.OFFICE365_WEBHOOK_CLIENT_STATE &&
    clientState !== process.env.OFFICE365_WEBHOOK_CLIENT_STATE
  ) {
    throw new HttpError({ statusCode: 403, message: "Invalid client state" });
  }

  const notifications = req.body?.value;

  if (!notifications || !Array.isArray(notifications)) {
    log.debug("No notifications found in request body");
    res.status(200).json({ message: "ok" });
    return;
  }

  // Process each notification
  for (const notification of notifications) {
    try {
      await processNotification(notification);
    } catch (error) {
      log.error("Error processing notification", safeStringify({ error, notification }));
      // Continue processing other notifications even if one fails
    }
  }

  res.status(200).json({ message: "ok" });
}

interface Notification {
  subscriptionId: string;
  resource: string;
  changeType: string;
}

async function processNotification(notification: Notification) {
  const { subscriptionId, resource, changeType } = notification;

  log.debug(
    "Processing notification",
    safeStringify({
      subscriptionId,
      resource,
      changeType,
    })
  );

  // Find the selected calendar associated with this subscription
  // Note: You'll need to store the subscriptionId when creating the subscription
  // For now, we'll invalidate cache for all Office 365 calendars
  // TODO: Implement proper subscription tracking in database

  // Get all Office 365 credentials and invalidate their cache
  const office365Credentials = await SelectedCalendarRepository.findMany({
    where: {
      integration: "office365_calendar",
    },
  });

  for (const selectedCalendar of office365Credentials) {
    if (!selectedCalendar.credentialId) continue;
    const credential = await CredentialRepository.findCredentialForCalendarServiceById({
      id: selectedCalendar.credentialId,
    });
    if (!credential) continue;

    try {
      const credentialForCalendarCache = await getCredentialForCalendarCache({
        credentialId: credential.id,
      });
      const calendarService = await getCalendar(credentialForCalendarCache);

      // Refresh the calendar cache
      await calendarService?.fetchAvailabilityAndSetCache?.([selectedCalendar]);

      log.debug(
        "Successfully refreshed cache for credential",
        safeStringify({
          credentialId: credential.id,
        })
      );
    } catch (error) {
      log.error(
        "Error refreshing cache for credential",
        safeStringify({
          error,
          credentialId: credential.id,
        })
      );
    }
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
