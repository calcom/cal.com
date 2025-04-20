import type { Prisma } from "@prisma/client";

import { uniqueBy } from "@calcom/lib/array";
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

  async getCachedAvailability(credentialId: number, args: FreeBusyArgs) {
    const key = parseKeyForCache(args);
    const cached = await prisma.calendarCache.findUnique({
      where: {
        credentialId_key: {
          credentialId,
          key,
        },
        expiresAt: { gte: new Date(Date.now()) },
      },
    });
    log.info("Got cached availability", safeStringify({ key, cached }));
    return cached;
  }
  async upsertCachedAvailability(
    credentialId: number,
    args: FreeBusyArgs,
    value: Prisma.JsonNullValueInput | Prisma.InputJsonValue
  ) {
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
        key,
        expiresAt: new Date(Date.now() + CACHING_TIME),
      },
    });
  }
}
