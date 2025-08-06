import type { NextApiRequest, NextApiResponse } from "next";

import { getCalendar } from "@calcom/features/calendars/lib/getCalendar";
import { getCalendarCredentials } from "@calcom/features/calendars/lib/getCalendarCredentials";
import { getCalendarsByViewer } from "@calcom/features/calendars/lib/getCalendarsByViewer";
import { performSelectedCalendarMutations } from "@calcom/features/calendars/lib/mutation/performSelectedCalendarMutations";
import { getSelectedCalendarsWithCredentials } from "@calcom/features/calendars/lib/selection";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import getApps from "../../_utils/getApps";

const log = logger.getSubLogger({ prefix: ["office365_webhook"] });

/**
 * Handles Microsoft Graph webhook notifications
 * 
 * @param req NextApiRequest object
 * @returns Response depending on the webhook type
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    return postHandler(req, res);
  } else if (req.method === "GET") {
    // Validation endpoint for Microsoft Graph subscriptions
    return validationHandler(req, res);
  }

  res.status(405).end();
}

/**
 * Handles webhook validation from Microsoft Graph
 * 
 * This is required for Microsoft Graph to verify the webhook endpoint
 */
async function validationHandler(req: NextApiRequest, res: NextApiResponse) {
  const { query } = req;
  
  // Microsoft Graph sends a validation token to verify the webhook
  const validationToken = query.validationToken;

  if (validationToken) {
    log.debug("Responding to Microsoft Graph validation");
    
    // We must respond with the validation token as plain text
    res.setHeader("Content-Type", "text/plain");
    
    // Return the validation token to confirm this endpoint is valid
    return res.send(validationToken);
  }

  return res.status(400).send("Bad Request: Missing validation token");
}

/**
 * Handles webhook notification from Microsoft Graph
 * 
 * This processes calendar change events and updates the calendar cache
 */
async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  // First, respond immediately to acknowledge receipt
  // Microsoft expects a 202 response within 30 seconds
  res.status(202).end();
  
  const body = req.body;
  
  try {
    if (Array.isArray(body.value)) {
      // Process each notification
      for (const notification of body.value) {
        await processNotification(notification);
      }
    } else {
      // Single notification
      await processNotification(body);
    }
  } catch (error) {
    log.error("Error processing Microsoft Graph webhook notifications", error);
  }
}

/**
 * Process an individual Microsoft Graph notification
 */
async function processNotification(notification: any) {
  try {
    // clientState is a security token we set when creating the subscription
    // It helps us verify this is a legitimate Microsoft Graph notification
    const clientState = notification.clientState;
    // The subscription ID from Microsoft Graph
    const subscriptionId = notification.subscriptionId;
    
    if (!clientState || !subscriptionId) {
      log.warn("Invalid notification received", { notification });
      return;
    }
    
    // Find the calendar associated with this subscription
    const selectedCalendar = await prisma.selectedCalendar.findFirst({
      where: {
        msGraphSubscriptionId: subscriptionId,
        msGraphClientState: clientState,
      },
      select: {
        id: true,
        userId: true,
        credentialId: true,
        externalId: true,
        integration: true,
        supportEventTypeIds: true,
        email: true,
      },
    });

    if (!selectedCalendar) {
      log.warn(`No calendar found for subscription ${subscriptionId}`);
      return;
    }

    // Get the credential for this calendar
    const credential = await prisma.credential.findUnique({
      where: {
        id: selectedCalendar.credentialId,
      },
    });

    if (!credential) {
      log.warn(`No credential found for calendar ${selectedCalendar.id}`);
      return;
    }

    // Get calendar credentials for cache refresh
    const credentialForCalendarCache = {
      ...credential,
      key: credential.key as unknown as string,
    } as CredentialPayload;

    // Initialize calendar service for cache update
    const calendarService = await getCalendar(credentialForCalendarCache);
    
    // Get all selected calendars for this user (to update all at once)
    const selectedCalendars = await getSelectedCalendarsWithCredentials(
      prisma, 
      selectedCalendar.userId, 
      selectedCalendar.integration,
    );

    // Update the cache for all calendars from this provider
    await calendarService?.fetchAvailabilityAndSetCache?.(selectedCalendars.map((cal: any) => ({
      externalId: cal.externalId,
      credentialId: cal.credentialId,
      integration: cal.integration,
    })));

    log.info(`Updated cache for calendar ${selectedCalendar.externalId} (subscription ${subscriptionId})`);

  } catch (error) {
    log.error("Error processing notification", error);
    throw error;
  }
}