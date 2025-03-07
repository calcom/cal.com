import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { CalendarCache } from "@calcom/features/calendar-cache/calendar-cache";
import { HttpError } from "@calcom/lib/http-error";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import type { SelectedCalendarEventTypeIds } from "@calcom/types/Calendar";

const validateRequest = (req: NextRequest) => {
  const apiKey = req.headers.get("authorization") || req.nextUrl.searchParams.get("apiKey");
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
  T extends { externalId: string; eventTypeId: number | null; credentialId: number | null; id: string }
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
          await SelectedCalendarRepository.updateById(id, { error: "Missing credentialId" });
          console.log("no credentialId for SelecedCalendar: ", id);
          return;
        }
        const cc = await CalendarCache.initFromCredentialId(credentialId);
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
      async ([externalId, { credentialId, eventTypeIds, id }]) => {
        if (!credentialId) {
          await SelectedCalendarRepository.updateById(id, { error: "Missing credentialId" });
          console.log("no credentialId for SelecedCalendar: ", id);
          return;
        }
        const cc = await CalendarCache.initFromCredentialId(credentialId);
        await cc.watchCalendar({ calendarId: externalId, eventTypeIds });
      }
    )
  );
  result.forEach(logRejected);
  return result;
};

const handler = defaultResponderForAppDir(async (request: NextRequest) => {
  validateRequest(request);
  await Promise.allSettled([handleCalendarsToWatch(), handleCalendarsToUnwatch()]);

  // TODO: Credentials can be installed on a whole team, check for selected calendars on the team
  return NextResponse.json({
    executedAt: new Date().toISOString(),
  });
});

export { handler as GET };
