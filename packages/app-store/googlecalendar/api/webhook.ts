import type { NextApiRequest } from "next";

import { buildNonDelegationCredential } from "@calcom/lib/delegationCredential/server";
import { findUniqueDelegationCalendarCredential } from "@calcom/lib/delegationCredential/server";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import type { SelectedCalendar } from "@calcom/prisma/client";
import type { CredentialPayload } from "@calcom/types/Credential";

import { getCalendar } from "../../_utils/getCalendar";

const log = logger.getSubLogger({ prefix: ["googlecalendar", "api", "webhook"] });

async function getCredentialForCalendarService(selectedCalendarMatchingGoogleChannelId: {
  credential: CredentialPayload | null;
  delegationCredentialId: string | null;
  userId: number;
  googleChannelId: string;
}) {
  if (selectedCalendarMatchingGoogleChannelId.credential) {
    return buildNonDelegationCredential(selectedCalendarMatchingGoogleChannelId.credential);
  } else if (selectedCalendarMatchingGoogleChannelId.delegationCredentialId) {
    return findUniqueDelegationCalendarCredential({
      userId: selectedCalendarMatchingGoogleChannelId.userId,
      delegationCredentialId: selectedCalendarMatchingGoogleChannelId.delegationCredentialId,
    });
  } else {
    throw new HttpError({
      statusCode: 200,
      message: `No credential or DelegationCredential found for selected calendar for googleChannelId: ${selectedCalendarMatchingGoogleChannelId.googleChannelId}`,
    });
  }
}

function getSelectedCalendarsForGoogleChannel(selectedCalendarMatchingGoogleChannelId: {
  credential: { selectedCalendars: SelectedCalendar[] } | null;
  delegationCredential: { selectedCalendars: SelectedCalendar[] } | null;
  userId: number;
  googleChannelId: string;
}) {
  if (selectedCalendarMatchingGoogleChannelId.credential) {
    // Regular credential case -> There could be multiple selected calendars for the same user because of different eventTypes
    return selectedCalendarMatchingGoogleChannelId.credential.selectedCalendars;
  } else if (selectedCalendarMatchingGoogleChannelId.delegationCredential) {
    // Because same delegationCredential is used by all members of the same organization
    const selectedCalendarsForAllTheMembersOfTheOrganization =
      selectedCalendarMatchingGoogleChannelId.delegationCredential.selectedCalendars;

    // There could be multiple selected calendars for the same user because of different eventTypes
    return selectedCalendarsForAllTheMembersOfTheOrganization.filter(
      (selectedCalendar) => selectedCalendar.userId === selectedCalendarMatchingGoogleChannelId.userId
    );
  } else {
    throw new HttpError({
      statusCode: 200,
      message: `No credential or DelegationCredential found for selected calendar for googleChannelId: ${selectedCalendarMatchingGoogleChannelId.googleChannelId}`,
    });
  }
}

async function updateCacheForGoogleChannel(channelId: string) {
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

  const credentialForCalendarService = await getCredentialForCalendarService({
    ...selectedCalendarMatchingGoogleChannelId,
    googleChannelId: channelId,
  });

  const allSelectedCalendarsForCredential = getSelectedCalendarsForGoogleChannel({
    ...selectedCalendarMatchingGoogleChannelId,
    googleChannelId: channelId,
  });
  const calendar = await getCalendar(credentialForCalendarService);
  await calendar?.fetchAvailabilityAndSetCache?.(allSelectedCalendarsForCredential);
}

async function postHandler(req: NextApiRequest) {
  const token = req.headers["x-goog-channel-token"];
  const channelId = req.headers["x-goog-channel-id"];
  log.debug("postHandler called with ", safeStringify({ token, channelId }));

  if (token !== process.env.GOOGLE_WEBHOOK_TOKEN) {
    throw new HttpError({ statusCode: 403, message: "Invalid token" });
  }
  if (typeof channelId !== "string") {
    throw new HttpError({ statusCode: 403, message: "Missing Channel ID" });
  }

  await updateCacheForGoogleChannel(channelId);
  return { message: "ok" };
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
