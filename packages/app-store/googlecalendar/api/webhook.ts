import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";

import { getCalendar } from "../../_utils/getCalendar";

async function postHandler(req: NextApiRequest) {
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
  const { credential } = selectedCalendar;
  if (!credential)
    throw new HttpError({
      statusCode: 200,
      message: `No credential found for selected calendar for googleChannelId: ${req.headers["x-goog-channel-id"]}`,
    });
  const { selectedCalendars } = credential;
  const calendar = await getCalendar(credential);

  // Make sure to pass unique SelectedCalendars to avoid unnecessary third party api calls
  // Necessary to do here so that it is ensure for all calendar apps
  await calendar?.fetchAvailabilityAndSetCache?.(selectedCalendars);
  return { message: "ok" };
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
