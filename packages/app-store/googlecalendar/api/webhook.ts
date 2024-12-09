import type { NextApiRequest } from "next";

import { getCredentialForCalendarService } from "@calcom/core/CalendarManager";
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

  const selectedCalendar = await SelectedCalendarRepository.findByGoogleChannelId(
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

  const credentialForCalendarService = await getCredentialForCalendarService(credential);
  const calendar = await getCalendar(credentialForCalendarService);
  await calendar?.fetchAvailabilityAndSetCache?.(selectedCalendars);
  return { message: "ok" };
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
