import type { Prisma } from "@prisma/client";

import { uniqueBy } from "@calcom/lib/array";
import { isDwdCredential } from "@calcom/lib/domainWideDelegation/clientAndServer";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { Calendar, SelectedCalendarEventTypeIds } from "@calcom/types/Calendar";

import type { ICalendarCacheRepository } from "./calendar-cache.repository.interface";
import { getTimeMax, getTimeMin } from "./lib/datesForCache";

const log = logger.getSubLogger({ prefix: ["CalendarCacheRepository"] });

/** Enable or disable the expanded cache. Enabled by default. */
const ENABLE_EXPANDED_CACHE = process.env.ENABLE_EXPANDED_CACHE !== "0";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ONE_MONTH_IN_MS = 30 * MS_PER_DAY;
const CACHING_TIME = ONE_MONTH_IN_MS;

export function parseKeyForCache(args: FreeBusyArgs): string {
  const { timeMin: _timeMin, timeMax: _timeMax, items } = args;
  // Ensure that calendarIds are unique
  const uniqueItems = uniqueBy(items, ["id"]);
  const { timeMin, timeMax } = handleMinMax(_timeMin, _timeMax);
  const key = JSON.stringify({ timeMin, timeMax, items: uniqueItems });
  return key;
}

/**
 * By expanding the cache to whole months, we can save round trips to the third party APIs.
 * In this case we already have the data in the database, so we can just return it.
 */
function handleMinMax(min: string, max: string) {
  if (!ENABLE_EXPANDED_CACHE) return { timeMin: min, timeMax: max };
  return { timeMin: getTimeMin(min), timeMax: getTimeMax(max) };
}

type FreeBusyArgs = { timeMin: string; timeMax: string; items: { id: string }[] };

const buildDwdCredential = ({ userId, dwdId }: { userId: number | null; dwdId: string | null }) => {
  if (!userId || !dwdId) {
    return null;
  }
  return {
    userId,
    dwdId,
  };
};

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

  async findUnique({
    credentialId,
    dwdCredential,
    key,
  }: {
    credentialId: number;
    dwdCredential: { dwdId: string; userId: number } | null;
    key: string;
  }) {
    log.debug("findUnique", safeStringify({ credentialId, dwdCredential, key }));
    if (dwdCredential) {
      const calendarCaches = await prisma.calendarCache.findMany({
        where: {
          dwdId: dwdCredential.dwdId,
          userId: dwdCredential.userId,
          key,
          expiresAt: { gte: new Date(Date.now()) },
        },
      });
      return calendarCaches[0] ?? null;
    } else if (credentialId) {
      return prisma.calendarCache.findFirst({
        where: {
          credentialId,
          key,
          expiresAt: { gte: new Date(Date.now()) },
        },
      });
    } else {
      log.error("findUnique: No credentialId or dwdId provided");
      return null;
    }
  }

  async getCachedAvailability({
    credentialId,
    dwdId,
    userId,
    args,
  }: {
    credentialId: number;
    dwdId: string | null;
    userId: number | null;
    args: FreeBusyArgs;
  }) {
    log.debug("getCachedAvailability", safeStringify({ credentialId, dwdId, userId, args }));
    const key = parseKeyForCache(args);
    const dwdCredential = buildDwdCredential({ userId, dwdId });
    const cached = await this.findUnique({ credentialId, dwdCredential, key });
    log.info("Cached availability result", safeStringify({ key, cached }));
    return cached;
  }
  async upsertCachedAvailability({
    dwdId,
    userId,
    credentialId,
    args,
    value,
  }: {
    dwdId: string | null;
    userId: number | null;
    credentialId: number | null;
    args: FreeBusyArgs;
    value: Prisma.JsonNullValueInput | Prisma.InputJsonValue;
  }) {
    log.debug("upsertCachedAvailability", safeStringify({ dwdId, userId, credentialId, args, value }));
    const key = parseKeyForCache(args);
    const dwdCredential = buildDwdCredential({ userId, dwdId });
    let where;
    if (dwdCredential) {
      where = {
        dwdId: dwdCredential.dwdId,
        userId: dwdCredential.userId,
        key,
      };
    } else if (credentialId) {
      if (isDwdCredential({ credentialId })) {
        log.error("upsertCachedAvailability: dwdCredential seems to be invalid");
        return;
      }
      where = {
        credentialId,
        key,
      };
    } else {
      log.error("upsertCachedAvailability: No credentialId or dwdCredential provided");
      return;
    }

    const existingCache = await prisma.calendarCache.findFirst({
      where,
    });

    if (existingCache) {
      log.debug("Updating existing cache", safeStringify({ existingCache }));
      await prisma.calendarCache.update({
        where: {
          id: existingCache.id,
        },
        data: {
          value,
          expiresAt: new Date(Date.now() + CACHING_TIME),
        },
      });
    } else {
      await prisma.calendarCache.create({
        data: {
          key,
          credentialId: isDwdCredential({ credentialId }) ? null : credentialId,
          dwdId: dwdCredential?.dwdId ?? null,
          userId: dwdCredential?.userId ?? null,
          value,
          expiresAt: new Date(Date.now() + CACHING_TIME),
        },
      });
    }
  }
}
