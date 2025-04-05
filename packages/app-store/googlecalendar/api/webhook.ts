import { NextResponse, type NextRequest } from "next/server";

import { buildNonDelegationCredential } from "@calcom/lib/delegationCredential/server";
import { HttpError } from "@calcom/lib/http-error";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import { defaultResponderForAppDir } from "@calcom/web/app/api/defaultResponderForAppDir";

import { getCalendar } from "../../_utils/getCalendar";

async function postHandler(req: NextRequest) {
  if (req.headers.get("x-goog-channel-token") !== process.env.GOOGLE_WEBHOOK_TOKEN) {
    throw new HttpError({ statusCode: 403, message: "Invalid API key" });
  }
  const channelId = req.headers.get("x-goog-channel-id");
  if (typeof channelId !== "string") {
    throw new HttpError({ statusCode: 403, message: "Missing Channel ID" });
  }

  // There could be multiple selected calendars for the same googleChannelId for different eventTypes and same user
  // Every such record has their googleChannel related fields set which are same
  // So, it is enough to get the first selected calendar for this googleChannelId
  // Further code gets all the selected calendars for this calendar's credential
  const selectedCalendar = await SelectedCalendarRepository.findFirstByGoogleChannelId(channelId);

  if (!selectedCalendar) {
    throw new HttpError({
      statusCode: 200,
      message: `No selected calendar found for googleChannelId: ${req.headers.get("x-goog-channel-id")}`,
    });
  }
  const { credential } = selectedCalendar;
  if (!credential)
    throw new HttpError({
      statusCode: 200,
      message: `No credential found for selected calendar for googleChannelId: ${req.headers.get(
        "x-goog-channel-id"
      )}`,
    });
  const { selectedCalendars } = credential;

  const calendar = await getCalendar(buildNonDelegationCredential(credential));

  // Make sure to pass unique SelectedCalendars to avoid unnecessary third party api calls
  // Necessary to do here so that it is ensure for all calendar apps
  await calendar?.fetchAvailabilityAndSetCache?.(selectedCalendars);
  return NextResponse.json({ message: "ok" });
}
export default defaultResponderForAppDir(postHandler);
