import type { NextApiRequest } from "next";

import type { ICalendarCacheRepository } from "@calcom/features/calendar-cache/calendar-cache.repository.interface";
import { CalendarSubscriptionRepository } from "@calcom/features/calendar-sync/calendarSubscription.repository";
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

async function getCalendarSubscriptionMap({
  calendarsWithEventTypeIdsGroupedTogether,
}: {
  calendarsWithEventTypeIdsGroupedTogether: ReturnType<typeof getUniqueCalendarsByExternalId>;
}) {
  const externalCalendarIds = Object.keys(calendarsWithEventTypeIdsGroupedTogether);
  const calendarSubscriptions =
    externalCalendarIds.length > 0
      ? await CalendarSubscriptionRepository.findMany({
          where: {
            providerType: "google_calendar",
            externalCalendarId: {
              in: externalCalendarIds,
            },
          },
        })
      : [];
  return new Map(calendarSubscriptions.map((cs) => [cs.externalCalendarId, cs]));
}

const handleCalendarsToUnwatch = async () => {
  const calendarsToUnwatch = await SelectedCalendarRepository.getNextBatchToUnwatch(500);
  log.info(`Found ${calendarsToUnwatch.length} calendars to unwatch`);
  const calendarsWithEventTypeIdsGroupedTogether = getUniqueCalendarsByExternalId(calendarsToUnwatch);
  const calendarSubscriptionMap = await getCalendarSubscriptionMap({
    calendarsWithEventTypeIdsGroupedTogether,
  });
  const result = await Promise.allSettled(
    Object.entries(calendarsWithEventTypeIdsGroupedTogether).map(
      async ([externalId, { eventTypeIds, credentialId, id }]) => {
        if (!credentialId) {
          // So we don't retry on next cron run

          // FIXME: There could actually be multiple calendars with the same externalId and thus we need to technically update error for all of them
          await SelectedCalendarRepository.setErrorInUnwatching({
            id,
            error: "Missing credentialId",
          });
          log.error("no credentialId for SelectedCalendar: ", id);
          return;
        }

        try {
          const cc = await CalendarCache.initFromCredentialId(credentialId);
          const calendarSubscription = calendarSubscriptionMap.get(externalId);
          await cc.unwatchCalendar({
            calendarId: externalId,
            eventTypeIds,
            calendarSubscription: calendarSubscription ?? null,
          });
          await SelectedCalendarRepository.removeUnwatchingError({ id });
        } catch (error) {
          let errorMessage = "Unknown error";
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          log.error(
            `Error unwatching calendar ${externalId}`,
            safeStringify({
              selectedCalendarId: id,
              error: errorMessage,
            })
          );
          await SelectedCalendarRepository.setErrorInUnwatching({
            id,
            error: `${errorMessage}`,
          });
        }
      }
    )
  );

  log.info(`Processed ${result.length} calendars for unwatching`);

  result.forEach(logRejected);
  return result;
};

const upsertCache = async ({
  calendarCache,
  credentialId,
  externalId,
}: {
  calendarCache: ICalendarCacheRepository;
  credentialId: number;
  externalId: string;
}) => {
  const calendarService = await calendarCache.getCalendarService();
  if (!calendarService) {
    log.error(`CalendarService is not available via CalendarCache for credentialId: ${credentialId}`);
    return;
  }
  const allSelectedCalendarsForCredential = await SelectedCalendarRepository.findFromCredentialId(
    credentialId
  );
  await calendarService.onWatchedCalendarChange?.({
    calendarId: externalId,
    syncActions: ["availability-cache"],
    selectedCalendars: allSelectedCalendarsForCredential,
  });
};

const handleCalendarsToWatch = async () => {
  const calendarsToWatch = await SelectedCalendarRepository.getNextBatchToWatch(500);
  log.info(`Found ${calendarsToWatch.length} calendars to watch`);
  const calendarsWithEventTypeIdsGroupedTogether = getUniqueCalendarsByExternalId(calendarsToWatch);
  const calendarSubscriptionMap = await getCalendarSubscriptionMap({
    calendarsWithEventTypeIdsGroupedTogether,
  });
  const result = await Promise.allSettled(
    Object.entries(calendarsWithEventTypeIdsGroupedTogether).map(
      async ([externalId, { credentialId, eventTypeIds, id }]) => {
        if (!credentialId) {
          // So we don't retry on next cron run
          await SelectedCalendarRepository.setErrorInWatching({ id, error: "Missing credentialId" });
          log.error("no credentialId for SelectedCalendar: ", id);
          return;
        }

        try {
          const cc = await CalendarCache.initFromCredentialId(credentialId);
          const calendarSubscription = calendarSubscriptionMap.get(externalId);
          const response = await cc.watchCalendar({
            calendarId: externalId,
            eventTypeIds,
            calendarSubscription: calendarSubscription ?? null,
          });
          await SelectedCalendarRepository.removeWatchingError({ id });

          if (response.reusedFromCalendarSubscription) {
            // It means that a new third party subscription wasn't created and thus no immediate webhook request with resourceState=sync will be sent that would populate the availability cache
            // So we ensure that the cache for free-busy time is populated for the first time.
            // TODO: Instead of relying on webhook to cache for the first time, we could use this strategy always. That keeps things simple. Note: Webhook is still needed for updating the cache when the availability changes.
            await upsertCache({
              calendarCache: cc,
              credentialId,
              externalId,
            });
          }
        } catch (error) {
          let errorMessage = "Unknown error";
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          log.error(
            `Error watching calendar ${externalId}`,
            safeStringify({
              selectedCalendarId: id,
              error: errorMessage,
            })
          );
          await SelectedCalendarRepository.setErrorInWatching({
            id,
            error: `${errorMessage}`,
          });
        }
      }
    )
  );
  log.info(`Processed ${result.length} calendars for watching`);
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
