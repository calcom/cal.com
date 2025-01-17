import type { NextApiRequest } from "next";

import { findDwdCalendarCredential } from "@calcom/lib/domainWideDelegation/server";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";

import { getCalendar } from "../../_utils/getCalendar";

const log = logger.getSubLogger({ prefix: ["googlecalendar", "api", "webhook"] });
async function postHandler(req: NextApiRequest) {
  log.debug("postHandler");
  if (req.headers["x-goog-channel-token"] !== process.env.GOOGLE_WEBHOOK_TOKEN) {
    throw new HttpError({ statusCode: 403, message: "Invalid API key" });
  }
  if (typeof req.headers["x-goog-channel-id"] !== "string") {
    throw new HttpError({ statusCode: 403, message: "Missing Channel ID" });
  }

  // There could be multiple selected calendars for the same googleChannelId for different eventTypes and same user
  // Every such record has their googleChannel related fields set which are same
  // So, it is enough to get the first selected calendar for this googleChannelId
  // Further code gets all the selected calendars for this calendar's credential
  const selectedCalendar = await SelectedCalendarRepository.findFirstByGoogleChannelId(
    req.headers["x-goog-channel-id"]
  );

  if (!selectedCalendar) {
    throw new HttpError({
      statusCode: 200,
      message: `No selected calendar found for googleChannelId: ${req.headers["x-goog-channel-id"]}`,
    });
  }
  const { credential, domainWideDelegationCredential, userId } = selectedCalendar;

  let selectedCalendars;
  let credentialForCalendarService;
  if (credential) {
    selectedCalendars = credential.selectedCalendars;
    credentialForCalendarService = credential;
  } else if (domainWideDelegationCredential) {
    const organizationAllMembersSelectedCalendars = domainWideDelegationCredential.selectedCalendars;
    // Use all the selected calendars of the same selectedCalendar's user
    // Because same dwd is used across all members of the same organization, we must have userId in the filter
    selectedCalendars = organizationAllMembersSelectedCalendars.filter(
      (selectedCalendar) => selectedCalendar.userId === userId
    );
    const dwdCalendarCredential = await findDwdCalendarCredential({
      userId,
      dwdId: domainWideDelegationCredential.id,
    });
    credentialForCalendarService = dwdCalendarCredential;
  } else {
    throw new HttpError({
      statusCode: 200,
      message: `No credential or DomainWideDelegation found for selected calendar for googleChannelId: ${req.headers["x-goog-channel-id"]}`,
    });
  }

  const calendar = await getCalendar(credentialForCalendarService);
  await calendar?.fetchAvailabilityAndSetCache?.(selectedCalendars);

  return { message: "ok" };
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
