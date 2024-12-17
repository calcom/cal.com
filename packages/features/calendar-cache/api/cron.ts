import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import type { SelectedCalendarEventTypeIds } from "@calcom/types/Calendar";

import { CalendarCache } from "../calendar-cache";

const validateRequest = (req: NextApiRequest) => {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }
};

function logRejected(result: PromiseSettledResult<unknown>) {
  if (result.status === "rejected") {
    console.error(result.reason);
  }
}

function getUniqueCalendarsByExternalId<
  T extends { externalId: string; eventTypeId: number | null; credentialId: number | null }
>(calendars: T[]) {
  type ExternalId = string;
  return calendars.reduce(
    (acc, sc) => {
      if (!acc[sc.externalId]) {
        acc[sc.externalId] = {
          eventTypeIds: [sc.eventTypeId],
          credentialId: sc.credentialId,
        };
      } else {
        acc[sc.externalId].eventTypeIds.push(sc.eventTypeId);
      }
      return acc;
    },
    {} as Record<
      ExternalId,
      {
        eventTypeIds: SelectedCalendarEventTypeIds;
        credentialId: number | null;
      }
    >
  );
}

const handleCalendarsToUnwatch = async () => {
  const calendarsToUnwatch = await SelectedCalendarRepository.getNextBatchToUnwatch();
  const calendarsWithEventTypeIdsGroupedTogether = getUniqueCalendarsByExternalId(calendarsToUnwatch);
  const result = await Promise.allSettled(
    Object.entries(calendarsWithEventTypeIdsGroupedTogether).map(
      async ([externalId, { eventTypeIds, credentialId }]) => {
        if (!credentialId) return;
        const cc = await CalendarCache.initFromCredentialId(credentialId);
        await cc.unwatchCalendar({ calendarId: externalId, eventTypeIds });
      }
    )
  );

  result.forEach(logRejected);
  return result;
};

const handleCalendarsToWatch = async () => {
  const calendarsToWatch = await SelectedCalendarRepository.getNextBatchToWatch();
  const calendarsWithEventTypeIdsGroupedTogether = getUniqueCalendarsByExternalId(calendarsToWatch);
  const result = await Promise.allSettled(
    Object.entries(calendarsWithEventTypeIdsGroupedTogether).map(
      async ([externalId, { credentialId, eventTypeIds }]) => {
        if (!credentialId) return;
        const cc = await CalendarCache.initFromCredentialId(credentialId);
        await cc.watchCalendar({ calendarId: externalId, eventTypeIds });
      }
    )
  );
  result.forEach(logRejected);
  return result;
};

// This cron is used to activate and renew calendar subcriptions
const handler = defaultResponder(async (request: NextApiRequest) => {
  validateRequest(request);
  const [watchedResult, unwatchedResult] = await Promise.all([
    handleCalendarsToWatch(),
    handleCalendarsToUnwatch(),
  ]);

  // TODO: Credentials can be installed on a whole team, check for selected calendars on the team
  return {
    succeededAt: new Date().toISOString(),
    watched: {
      successful: watchedResult.filter((x) => x.status === "fulfilled").length,
      failed: watchedResult.filter((x) => x.status === "rejected").length,
    },
    unwatched: {
      successful: unwatchedResult.filter((x) => x.status === "fulfilled").length,
      failed: unwatchedResult.filter((x) => x.status === "rejected").length,
    },
  };
});

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
