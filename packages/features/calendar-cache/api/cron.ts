import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import type { SelectedCalendarEventTypeIds } from "@calcom/types/Calendar";

import { CalendarCache } from "../calendar-cache";

const log = logger.getSubLogger({ prefix: ["CalendarCacheCron"] });

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
  T extends {
    externalId: string;
    eventTypeId: number | null;
    credentialId: number | null;
    id: string;
  }
>(calendars: T[]) {
  type ExternalId = string;
  return calendars.reduce(
    (acc, sc) => {
      if (!acc[sc.externalId]) {
        acc[sc.externalId] = {
          eventTypeIds: [sc.eventTypeId],
          credentialId: sc.credentialId,
          id: sc.id,
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
        id: string;
      }
    >
  );
}

const handleCalendarsToUnwatch = async () => {
  const calendarsToUnwatch = await SelectedCalendarRepository.getNextBatchToUnwatch(500);
  const calendarsWithEventTypeIdsGroupedTogether = getUniqueCalendarsByExternalId(calendarsToUnwatch);
  const result = await Promise.allSettled(
    Object.entries(calendarsWithEventTypeIdsGroupedTogether).map(
      async ([externalId, { eventTypeIds, credentialId, id }]) => {
        if (!credentialId) {
          // So we don't retry on next cron run

          // FIXME: There could actually be multiple calendars with the same externalId and thus we need to technically update error for all of them
          await SelectedCalendarRepository.updateById(id, {
            error: "Missing credentialId",
          });
          log.error("no credentialId for SelectedCalendar: ", id);
          return;
        }

        try {
          const cc = await CalendarCache.initFromCredentialId(credentialId);
          await cc.unwatchCalendar({ calendarId: externalId, eventTypeIds });
        } catch (error) {
          let errorMessage = "Unknown error";
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          log.error(
            "Error unwatching calendar: ",
            safeStringify({
              selectedCalendarId: id,
              error: errorMessage,
            })
          );
          await SelectedCalendarRepository.updateById(id, {
            error: `Error unwatching calendar: ${errorMessage}`,
          });
        }
      }
    )
  );

  result.forEach(logRejected);
  return result;
};

const handleCalendarsToWatch = async () => {
  const calendarsToWatch = await SelectedCalendarRepository.getNextBatchToWatch(500);
  const calendarsWithEventTypeIdsGroupedTogether = getUniqueCalendarsByExternalId(calendarsToWatch);
  const result = await Promise.allSettled(
    Object.entries(calendarsWithEventTypeIdsGroupedTogether).map(
      async ([externalId, { credentialId, eventTypeIds, id }]) => {
        if (!credentialId) {
          // So we don't retry on next cron run
          await SelectedCalendarRepository.updateById(id, {
            error: "Missing credentialId",
          });
          log.error("no credentialId for SelectedCalendar: ", id);
          return;
        }

        try {
          const cc = await CalendarCache.initFromCredentialId(credentialId);
          await cc.watchCalendar({ calendarId: externalId, eventTypeIds });
        } catch (error) {
          let errorMessage = "Unknown error";
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          log.error(
            "Error watching calendar: ",
            safeStringify({
              selectedCalendarId: id,
              error: errorMessage,
            })
          );
          await SelectedCalendarRepository.updateById(id, {
            error: `Error watching calendar: ${errorMessage}`,
          });
        }
      }
    )
  );
  result.forEach(logRejected);
  return result;
};

// This cron is used to activate and renew calendar subscriptions
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
