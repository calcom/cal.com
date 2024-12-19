import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";

import { CalendarCache } from "../calendar-cache";

const validateRequest = (req: NextApiRequest) => {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }
};

const handleCalendarsToUnwatch = async () => {
  const calendarsToUnwatch = await SelectedCalendarRepository.getNextBatchToUnwatch();
  const result = await Promise.allSettled(
    calendarsToUnwatch.map(async (sc) => {
      if (!sc.credentialId) return;
      const cc = await CalendarCache.initFromCredentialId(sc.credentialId);
      await cc.unwatchCalendar({ calendarId: sc.externalId });
    })
  );

  return result;
};
const handleCalendarsToWatch = async () => {
  const calendarsToWatch = await SelectedCalendarRepository.getNextBatchToWatch();
  const result = await Promise.allSettled(
    calendarsToWatch.map(async (sc) => {
      if (!sc.credentialId) return;
      const cc = await CalendarCache.initFromCredentialId(sc.credentialId);
      await cc.watchCalendar({ calendarId: sc.externalId });
    })
  );

  return result;
};

// This cron is used to activate and renew calendar subcriptions
const handler = defaultResponder(async (request: NextApiRequest) => {
  validateRequest(request);
  await Promise.allSettled([handleCalendarsToWatch(), handleCalendarsToUnwatch()]);

  // TODO: Credentials can be installed on a whole team, check for selected calendars on the team
  return {
    executedAt: new Date().toISOString(),
  };
});

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
