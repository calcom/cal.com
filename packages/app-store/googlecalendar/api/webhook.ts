import type { NextApiRequest } from "next";

import { buildNonDelegationCredential } from "@calcom/lib/delegationCredential/server";
import { findUniqueDelegationCalendarCredential } from "@calcom/lib/delegationCredential/server";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";

import { getCalendar } from "../../_utils/getCalendar";

const log = logger.getSubLogger({ prefix: ["googlecalendar", "api", "webhook"] });
async function postHandler(req: NextApiRequest) {
  const token = req.headers["x-goog-channel-token"];
  const channelId = req.headers["x-goog-channel-id"];
  log.debug("postHandler called with ", safeStringify({ token, channelId }));

  if (token !== process.env.GOOGLE_WEBHOOK_TOKEN) {
    throw new HttpError({ statusCode: 403, message: "Invalid API key" });
  }
  if (typeof channelId !== "string") {
    throw new HttpError({ statusCode: 403, message: "Missing Channel ID" });
  }

  // There could be multiple selected calendars for the same googleChannelId for different eventTypes and same user.
  // Every such record has their googleChannel related fields set which are same
  // So, it is enough to get the first selected calendar for this googleChannelId
  // Further code gets all the selected calendars for this calendar's credential
  const selectedCalendarMatchingGoogleChannelId = await SelectedCalendarRepository.findFirstByGoogleChannelId(
    channelId
  );

  if (!selectedCalendarMatchingGoogleChannelId) {
    throw new HttpError({
      statusCode: 200,
      message: `No selected calendar found for googleChannelId: ${channelId}`,
    });
  }
  const { credential, delegationCredential } = selectedCalendarMatchingGoogleChannelId;

  let allSelectedCalendarsForCredential;
  let credentialForCalendarService;

  if (credential) {
    // Regular credential case ->
    allSelectedCalendarsForCredential = credential.selectedCalendars;
    credentialForCalendarService = buildNonDelegationCredential(credential);
  } else if (delegationCredential) {
    // Because same delegationCredential is used across all members of the same organization, here we get the selected calendars for all the members of the organization
    const selectedCalendarsForAllTheMembersOfTheOrganization = delegationCredential.selectedCalendars;
    allSelectedCalendarsForCredential = selectedCalendarsForAllTheMembersOfTheOrganization.filter(
      (selectedCalendar) => selectedCalendar.userId === selectedCalendarMatchingGoogleChannelId.userId
    );
    const delegationCalendarCredential = await findUniqueDelegationCalendarCredential({
      userId: selectedCalendarMatchingGoogleChannelId.userId,
      delegationCredentialId: delegationCredential.id,
    });
    credentialForCalendarService = delegationCalendarCredential;
  } else {
    throw new HttpError({
      statusCode: 200,
      message: `No credential or DomainWideDelegation found for selected calendar for googleChannelId: ${channelId}`,
    });
  }

  const calendar = await getCalendar(credentialForCalendarService);
  await calendar?.fetchAvailabilityAndSetCache?.(allSelectedCalendarsForCredential);

  return { message: "ok" };
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
