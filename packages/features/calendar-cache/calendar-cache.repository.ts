import type { Prisma } from "@prisma/client";

import { uniqueBy } from "@calcom/lib/array";
import { isDelegationCredential } from "@calcom/lib/delegationCredential/clientAndServer";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { Calendar, SelectedCalendarEventTypeIds } from "@calcom/types/Calendar";

import type { ICalendarCacheRepository } from "./calendar-cache.repository.interface";
import { getTimeMax, getTimeMin } from "./lib/datesForCache";

const log = logger.getSubLogger({ prefix: ["CalendarCacheRepository"] });

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ONE_MONTH_IN_MS = 30 * MS_PER_DAY;
const CACHING_TIME = ONE_MONTH_IN_MS;

function parseKeyForCache(args: FreeBusyArgs): string {
  // Ensure that calendarIds are unique
  const uniqueItems = uniqueBy(args.items, ["id"]);
  const key = JSON.stringify({
    timeMin: getTimeMin(args.timeMin),
    timeMax: getTimeMax(args.timeMax),
    items: uniqueItems,
  });
  return key;
}

type FreeBusyArgs = { timeMin: string; timeMax: string; items: { id: string }[] };

export class CalendarCacheRepository implements ICalendarCacheRepository {
  calendar: Calendar | null;
  constructor(calendar: Calendar | null = null) {
    this.calendar = calendar;
  }
  async watchCalendar(args: { calendarId: string; eventTypeIds: SelectedCalendarEventTypeIds }) {
    const { calendarId, eventTypeIds } = args;
    if (typeof this.calendar?.watchCalendar !== "function") {
      log.info(
        '[handleWatchCalendar] Skipping watching calendar due to calendar not having "watchCalendar" method'
      );
      return;
    }
    await this.calendar?.watchCalendar({ calendarId, eventTypeIds });
  }

  async unwatchCalendar(args: { calendarId: string; eventTypeIds: SelectedCalendarEventTypeIds }) {
    const { calendarId, eventTypeIds } = args;
    if (typeof this.calendar?.unwatchCalendar !== "function") {
      log.info(
        '[unwatchCalendar] Skipping unwatching calendar due to calendar not having "unwatchCalendar" method'
      );
      return;
    }
    const response = await this.calendar?.unwatchCalendar({ calendarId, eventTypeIds });
    return response;
  }

  async getCachedAvailability({
    credentialId,
    userId,
    args,
  }: {
    credentialId: number;
    userId: number;
    args: FreeBusyArgs;
  }) {
    log.debug("Getting cached availability", safeStringify({ credentialId, userId, args }));
    const key = parseKeyForCache(args);
    let cached;
    if (isDelegationCredential({ credentialId })) {
      // We don't have credentialId available when querying the cache, as we use in-memory delegation credentials for this which don't have valid credentialId
      // Also, we would prefer to reuse the existing calendar-cache(connected to regular credentials) when enabling delegation credentials, for which we need to use userId and not credentialId
      // Security/Privacy wise, it is fine to query solely based on userId as userId and key(which has external email Ids in there) together can be used to uniquely identify the cache
      // A user could have multiple third party calendars connected, but they key would still be different for each case in calendar-cache because of the presence of emails in there.
      // Sample key: {"timeMin":"2025-04-01T00:00:00.000Z","timeMax":"2025-08-01T00:00:00.000Z","items":[{"id":"owner@example.com"}]} <- Notice it has emailId in there for which busytimes are fetched, we could assume that these emailIds would be unique across different calendars like Google/Outlook
      cached = await prisma.calendarCache.findFirst({
        // We have index on userId and key, so this should be fast
        // TODO: Should we consider index on all three - userId, key and expiresAt?
        where: {
          userId,
          key,
          expiresAt: { gte: new Date(Date.now()) },
        },
      });
    } else {
      cached = await prisma.calendarCache.findUnique({
        where: {
          credentialId_key: {
            credentialId,
            key,
          },
          expiresAt: { gte: new Date(Date.now()) },
        },
      });
    }
    log.info("Got cached availability", safeStringify({ key, cached }));
    return cached;
  }
  async upsertCachedAvailability({
    credentialId,
    userId,
    args,
    value,
  }: {
    credentialId: number;
    userId: number;
    args: FreeBusyArgs;
    value: Prisma.JsonNullValueInput | Prisma.InputJsonValue;
  }) {
    const key = parseKeyForCache(args);
    await prisma.calendarCache.upsert({
      where: {
        credentialId_key: {
          credentialId,
          key,
        },
      },
      update: {
        value,
        expiresAt: new Date(Date.now() + CACHING_TIME),
      },
      create: {
        value,
        credentialId,
        userId,
        key,
        expiresAt: new Date(Date.now() + CACHING_TIME),
      },
    });
  }
}
