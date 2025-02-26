import type { NextApiRequest } from "next";
import { z } from "zod";

import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";

import { getCalendar } from "../../_utils/getCalendar";

const googleHeadersSchema = z.object({
  "x-goog-channel-expiration": z.string(), // Sat, 22 Mar 2025 19:14:43 GMT
  "x-goog-channel-id": z.string(), // xxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  "x-goog-channel-token": z.string(), // XXXXXXXXXXXXXXXXXXx/XXXXXXXXXXXX=
  "x-goog-message-number": z.string(), // 398005
  "x-goog-resource-id": z.string(), // XXXXXXXXXXXXXXXXXX_XXX
  "x-goog-resource-state": z.string(), // exists
  "x-goog-resource-uri": z.string(), // https://www.googleapis.com/calendar/v3/calendars/user%40example.com/events?alt=json
});

async function getCalendarFromChannelId(channelId: string) {
  // There could be multiple selected calendars for the same googleChannelId for different eventTypes and same user
  // Every such record has their googleChannel related fields set which are same
  // So, it is enough to get the first selected calendar for this googleChannelId
  // Further code gets all the selected calendars for this calendar's credential
  const selectedCalendar = await SelectedCalendarRepository.findFirstByGoogleChannelId(channelId);

  if (!selectedCalendar) {
    // TODO: Report and unsubscribe from the channel to prevent further webhooks
    throw new HttpError({
      statusCode: 404,
      message: `No selected calendar found for googleChannelId: ${channelId}`,
    });
  }
  const { credential } = selectedCalendar;
  if (!credential)
    // TODO: Report and unsubscribe from the channel to prevent further webhooks
    throw new HttpError({
      statusCode: 404,
      message: `No credential found for selected calendar for googleChannelId: ${channelId}`,
    });
  const calendar = await getCalendar(credential);
  if (!calendar) {
    // TODO: Report and unsubscribe from the channel to prevent further webhooks
    throw new HttpError({
      statusCode: 404,
      message: `No calendar found for credential: ${credential.id}`,
    });
  }
  return calendar;
}

async function postHandler(req: NextApiRequest) {
  const {
    "x-goog-channel-token": channelToken,
    "x-goog-channel-id": channelId,
    "x-goog-resource-id": eventId,
  } = googleHeadersSchema.parse(req.headers);
  if (channelToken !== process.env.GOOGLE_WEBHOOK_TOKEN) {
    throw new HttpError({ statusCode: 403, message: "Invalid API key" });
  }
  if (!channelId) {
    throw new HttpError({ statusCode: 403, message: "Missing Channel ID" });
  }
  const calendar = await getCalendarFromChannelId(channelId);
  await calendar?.onWatchedCalendarChange?.(channelId, eventId);
  return { message: "ok" };
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
