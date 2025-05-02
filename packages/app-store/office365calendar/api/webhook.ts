import type { NextApiRequest, NextApiResponse } from "next";

import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";

import { getCalendar } from "../../_utils/getCalendar";

const log = logger.getSubLogger({ prefix: ["Office365CalendarWebhook"] });

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  // Handle Microsoft Graph validation request
  const validationToken = req.query.validationToken;
  if (validationToken) {
    res.setHeader("Content-Type", "text/plain");
    res.send(validationToken);
    return;
  }

  // Validate clientState
  const clientState = req.body?.value?.[0]?.clientState;
  const subscriptionId = req.body?.value?.[0]?.subscriptionId;

  log.debug("postHandler", safeStringify({ clientState, subscriptionId }));

  if (clientState !== process.env.MICROSOFT_WEBHOOK_TOKEN) {
    throw new HttpError({ statusCode: 403, message: "Invalid clientState" });
  }

  if (typeof subscriptionId !== "string") {
    throw new HttpError({ statusCode: 403, message: "Missing subscriptionId" });
  }

  // Find the first selected calendar with this subscriptionId
  const selectedCalendar = await SelectedCalendarRepository.findFirstByMicrosoftSubscriptionId(
    subscriptionId
  );

  if (!selectedCalendar) {
    throw new HttpError({
      statusCode: 200,
      message: `No selected calendar found for subscriptionId: ${subscriptionId}`,
    });
  }

  const { credential } = selectedCalendar;
  if (!credential) {
    throw new HttpError({
      statusCode: 200,
      message: `No credential found for selected calendar for subscriptionId: ${subscriptionId}`,
    });
  }

  // Get all selected calendars for this credential to update the cache
  const { selectedCalendars } = credential;
  const credentialForCalendarCache = await getCredentialForCalendarCache({ credentialId: credential.id });
  const calendarServiceForCalendarCache = await getCalendar(credentialForCalendarCache);

  // Update the cache for all selected calendars
  await calendarServiceForCalendarCache?.fetchAvailabilityAndSetCache?.(selectedCalendars);

  return { message: "ok" };
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
