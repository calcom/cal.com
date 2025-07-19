import type { NextApiRequest, NextApiResponse } from "next";

import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";

import { getCalendar } from "../../_utils/getCalendar";

const log = logger.getSubLogger({ prefix: ["office365calendar", "webhook"] });

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const validationToken = req.query.validationToken as string;
  if (!validationToken) {
    throw new HttpError({ statusCode: 400, message: "Missing validation token" });
  }

  res.setHeader("Content-Type", "text/plain");
  res.status(200).send(validationToken);
}

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const validationToken = req.query.validationToken;
  if (validationToken && typeof validationToken === "string") {
    res.setHeader("Content-Type", "text/plain");
    res.status(200).send(validationToken);
    return;
  }

  const { value: notifications } = req.body;

  if (!notifications || !Array.isArray(notifications)) {
    throw new HttpError({ statusCode: 400, message: "Invalid notification payload" });
  }

  const expectedClientState = process.env.OFFICE365_WEBHOOK_CLIENT_STATE;
  if (!expectedClientState) {
    log.error("OFFICE365_WEBHOOK_CLIENT_STATE not configured");
    throw new HttpError({ statusCode: 500, message: "Webhook not configured" });
  }

  for (const notification of notifications) {
    if (notification.clientState !== expectedClientState) {
      throw new HttpError({ statusCode: 403, message: "Invalid client state" });
    }
  }

  for (const notification of notifications) {
    try {
      const { subscriptionId, resource } = notification;

      if (!subscriptionId || !resource) {
        log.warn("Notification missing required fields");
        continue;
      }

      log.debug("Processing notification", { subscriptionId });

      const selectedCalendar = await SelectedCalendarRepository.findFirstByOffice365SubscriptionId(
        subscriptionId
      );

      if (!selectedCalendar) {
        log.debug("No selected calendar found for subscription", { subscriptionId });
        continue;
      }

      const { credential } = selectedCalendar;
      if (!credential) {
        log.debug("No credential found for selected calendar", { subscriptionId });
        continue;
      }

      const { selectedCalendars } = credential;
      const credentialForCalendarCache = await getCredentialForCalendarCache({ credentialId: credential.id });
      const calendarServiceForCalendarCache = await getCalendar(credentialForCalendarCache);
      await calendarServiceForCalendarCache?.fetchAvailabilityAndSetCache?.(selectedCalendars);
      log.debug("Successfully updated calendar cache", { subscriptionId });
    } catch (error) {
      log.error(
        "Error processing notification",
        safeStringify({ error, subscriptionId: notification.subscriptionId })
      );
    }
  }

  return { message: "ok" };
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
