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
  T extends {
    externalId: string;
    eventTypeId: number | null;
    credentialId: number | null;
    userId: number;
    id: string;
    domainWideDelegationCredentialId: string | null;
  }
>(calendars: T[]) {
  type ExternalId = string;
  return calendars.reduce(
    (acc, sc) => {
      if (!acc[sc.externalId]) {
        acc[sc.externalId] = {
          eventTypeIds: [sc.eventTypeId],
          credentialId: sc.credentialId,
          userId: sc.userId,
          id: sc.id,
          domainWideDelegationCredentialId: sc.domainWideDelegationCredentialId,
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
        userId: number;
        domainWideDelegationCredentialId: string | null;
      }
    >
  );
}

const handleCalendarsToUnwatch = async () => {
  const calendarsToUnwatch = await SelectedCalendarRepository.getNextBatchToUnwatch(500);
  const calendarsWithEventTypeIdsGroupedTogether = getUniqueCalendarsByExternalId(calendarsToUnwatch);
  const result = await Promise.allSettled(
    Object.entries(calendarsWithEventTypeIdsGroupedTogether).map(
      async ([externalId, { eventTypeIds, credentialId, userId, domainWideDelegationCredentialId, id }]) => {
        if (!credentialId && !domainWideDelegationCredentialId) {
          // So we don't retry on next cron run
          await SelectedCalendarRepository.updateById(id, {
            error: "Missing credentialId and domainWideDelegationCredentialId",
          });
          console.log("no credentialId and domainWideDelegationCredentialId for SelecedCalendar: ", id);
          return;
        }
        const cc = await CalendarCache.initFromDwdOrRegularCredential({
          credentialId,
          dwdId: domainWideDelegationCredentialId,
          userId,
        });
        await cc.unwatchCalendar({ calendarId: externalId, eventTypeIds });
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
      async ([externalId, { credentialId, domainWideDelegationCredentialId, eventTypeIds, id, userId }]) => {
        if (!credentialId && !domainWideDelegationCredentialId) {
          // So we don't retry on next cron run
          await SelectedCalendarRepository.updateById(id, {
            error: "Missing credentialId and domainWideDelegationCredentialId",
          });
          console.log("no credentialId and domainWideDelegationCredentialId for SelecedCalendar: ", id);
          return;
        }
        const cc = await CalendarCache.initFromDwdOrRegularCredential({
          credentialId,
          dwdId: domainWideDelegationCredentialId,
          userId,
        });
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
  await Promise.allSettled([handleCalendarsToWatch(), handleCalendarsToUnwatch()]);

  // TODO: Credentials can be installed on a whole team, check for selected calendars on the team
  return {
    executedAt: new Date().toISOString(),
  };
});

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
