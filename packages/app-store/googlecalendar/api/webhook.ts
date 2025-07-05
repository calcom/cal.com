import type { NextApiRequest } from "next";

import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";

import { getCalendar } from "../../_utils/getCalendar";

const log = logger.getSubLogger({ prefix: ["GoogleCalendarWebhook"] });

async function postHandler(req: NextApiRequest) {
  const channelToken = req.headers["x-goog-channel-token"];
  const channelId = req.headers["x-goog-channel-id"];

  log.debug("postHandler", safeStringify({ channelToken, channelId }));
  if (channelToken !== process.env.GOOGLE_WEBHOOK_TOKEN) {
    throw new HttpError({ statusCode: 403, message: "Invalid API key" });
  }
  if (typeof channelId !== "string") {
    throw new HttpError({ statusCode: 403, message: "Missing Channel ID" });
  }

  // There could be multiple selected calendars for the same googleChannelId for different eventTypes and same user
  // Every such record has their googleChannel related fields set which are same
  // So, it is enough to get the first selected calendar for this googleChannelId
  // Further code gets all the selected calendars for this calendar's credential
  const selectedCalendar = await SelectedCalendarRepository.findFirstByGoogleChannelId(channelId);

  if (!selectedCalendar) {
    log.info("postHandler", `No selected calendar found for googleChannelId: ${channelId}`);
    return { message: "ok" };
  }
  const { credential } = selectedCalendar;
  if (!credential) {
    log.info("postHandler", `No credential found for selected calendar for googleChannelId: ${channelId}`);
    return { message: "ok" };
  }
  const { selectedCalendars } = credential;
  const credentialForCalendarCache = await getCredentialForCalendarCache({ credentialId: credential.id });
  const calendarServiceForCalendarCache = await getCalendar(credentialForCalendarCache);

  await calendarServiceForCalendarCache?.fetchAvailabilityAndSetCache?.(selectedCalendars);
  return { message: "ok" };
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
