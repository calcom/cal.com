import type { Prisma } from "@prisma/client";

import { uniqueBy } from "@calcom/lib/array";
import { isInMemoryDelegationCredential } from "@calcom/lib/delegationCredential/clientAndServer";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { Calendar, SelectedCalendarEventTypeIds } from "@calcom/types/Calendar";

import type { ICalendarCacheRepository } from "./calendar-cache.repository.interface";

const log = logger.getSubLogger({ prefix: ["CalendarCacheRepository"] });

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const THREE_MONTHS_IN_MS = 90 * MS_PER_DAY;
const CACHING_TIME = THREE_MONTHS_IN_MS;

function parseKeyForCache(args: FreeBusyArgs): string {
  const uniqueItems = uniqueBy(args.items, ["id"]);
  const key = JSON.stringify({
    items: uniqueItems,
  });
  return key;
}

type FreeBusyArgs = { timeMin: string; timeMax: string; items: { id: string }[] };

type CalendarCacheValue = {
  calendars?: Record<
    string,
    { busy?: Array<{ start: string | Date; end: string | Date; id?: string | null }> }
  >;
  dateRange?: {
    timeMin: string;
    timeMax: string;
  };
};

/**
 * It means that caller can only work with DB Credentials
 * In-memory delegation credentials aren't supported here. Delegation User Credentials, that are in DB and have credential.delegationCredential relation can be used though
 */
function assertCalendarHasDbCredential(calendar: Calendar | null) {
  if (!calendar?.getCredentialId) {
    return;
  }
  const credentialId = calendar.getCredentialId();
  if (credentialId < 0) {
    throw new Error(`Received invalid credentialId ${credentialId}`);
  }
}
/**
 * It means that caller can work with in-memory credential
 */
function declareCanWorkWithInMemoryCredential() {
  // No assertion required here, it is for readability who reads the caller's code
}

export class CalendarCacheRepository implements ICalendarCacheRepository {
  calendar: Calendar | null;
  constructor(calendar: Calendar | null = null) {
    this.calendar = calendar;
  }
  async watchCalendar(args: { calendarId: string; eventTypeIds: SelectedCalendarEventTypeIds }) {
    assertCalendarHasDbCredential(this.calendar);
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
    assertCalendarHasDbCredential(this.calendar);
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
    userId: number | null;
    args: FreeBusyArgs;
  }) {
    declareCanWorkWithInMemoryCredential();
    log.debug("Getting cached availability", safeStringify({ credentialId, userId, args }));
    const key = parseKeyForCache(args);
    let cached;
    let usedInMemoryDelegationCredential = false;
    if (isInMemoryDelegationCredential({ credentialId })) {
      usedInMemoryDelegationCredential = true;
      if (!userId) {
        log.warn("userId is not available when querying cache for in-memory delegation credential");
        return null;
      }
      // Calendar-based cache lookup for in-memory delegation credentials
      // Sample key: {"items":[{"id":"owner@example.com"}]} <- Now only contains calendar IDs
      cached = await prisma.calendarCache.findFirst({
        // We have index on userId and key, so this should be fast
        // TODO: Should we consider index on all three - userId, key and expiresAt?
        where: {
          userId,
          key,
          expiresAt: { gte: new Date(Date.now()) },
        },
        orderBy: {
          // In case of multiple entries for same key and userId, we prefer the one with highest expiry, which will be the most updated one
          // TODO: For better tracking we could also want to use updatedAt directly which doesn't exist yet in CalendarCache table
          expiresAt: "desc",
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

    if (cached && cached.value) {
      const cacheValue = cached.value as CalendarCacheValue;
      if (cacheValue.dateRange) {
        const cachedTimeMin = new Date(cacheValue.dateRange.timeMin);
        const cachedTimeMax = new Date(cacheValue.dateRange.timeMax);
        const requestedTimeMin = new Date(args.timeMin);
        const requestedTimeMax = new Date(args.timeMax);

        if (requestedTimeMin >= cachedTimeMin && requestedTimeMax <= cachedTimeMax) {
          log.info(
            "Cache hit with range coverage",
            safeStringify({
              key,
              cached: !!cached,
              credentialId,
              usedInMemoryDelegationCredential,
              cachedRange: cacheValue.dateRange,
              requestedRange: { timeMin: args.timeMin, timeMax: args.timeMax },
            })
          );
          return cached;
        } else {
          log.info(
            "Cache found but date range not covered, extending cache",
            safeStringify({
              key,
              credentialId,
              cachedRange: cacheValue.dateRange,
              requestedRange: { timeMin: args.timeMin, timeMax: args.timeMax },
            })
          );
          return cached;
        }
      }
    }

    log.info(
      "Got cached availability",
      safeStringify({ key, cached: !!cached, credentialId, usedInMemoryDelegationCredential })
    );
    return cached;
  }
  async upsertCachedAvailability({
    credentialId,
    userId,
    args,
    value,
    nextSyncToken,
  }: {
    credentialId: number;
    userId: number | null;
    args: FreeBusyArgs;
    value: Prisma.JsonNullValueInput | Prisma.InputJsonValue;
    nextSyncToken?: string | null;
  }) {
    assertCalendarHasDbCredential(this.calendar);
    const key = parseKeyForCache(args);

    const enhancedValue = value as CalendarCacheValue;
    if (enhancedValue && typeof enhancedValue === "object") {
      enhancedValue.dateRange = {
        timeMin: args.timeMin,
        timeMax: args.timeMax,
      };
    }

    let finalValue: Prisma.JsonNullValueInput | Prisma.InputJsonValue = enhancedValue;

    if (nextSyncToken) {
      const existingCache = await this.getCachedAvailability({
        credentialId,
        userId,
        args,
      });

      if (existingCache?.value) {
        finalValue = this.mergeCacheValues(existingCache.value, enhancedValue, args);
      }
    }

    await prisma.calendarCache.upsert({
      where: {
        credentialId_key: {
          credentialId,
          key,
        },
      },
      update: {
        // Ensure that on update userId is also set(It handles the case where userId is not set for legacy records)
        userId,
        value: finalValue,
        ...(nextSyncToken !== undefined && { nextSyncToken }),
        expiresAt: new Date(Date.now() + CACHING_TIME),
      },
      create: {
        value: finalValue,
        credentialId,
        userId,
        key,
        ...(nextSyncToken !== undefined && { nextSyncToken }),
        expiresAt: new Date(Date.now() + CACHING_TIME),
      },
    });
  }

  private mergeCacheValues(
    existingValue: Prisma.JsonValue,
    newValue: Prisma.JsonNullValueInput | Prisma.InputJsonValue,
    args?: FreeBusyArgs
  ): Prisma.InputJsonValue {
    try {
      const existing = existingValue as CalendarCacheValue;
      const incoming = newValue as CalendarCacheValue;

      if (!existing?.calendars || !incoming?.calendars) {
        return newValue as Prisma.InputJsonValue;
      }

      const result: CalendarCacheValue = {
        calendars: { ...existing.calendars },
      };

      if (existing.dateRange && incoming.dateRange) {
        const existingTimeMin = new Date(existing.dateRange.timeMin);
        const existingTimeMax = new Date(existing.dateRange.timeMax);
        const incomingTimeMin = new Date(incoming.dateRange.timeMin);
        const incomingTimeMax = new Date(incoming.dateRange.timeMax);

        result.dateRange = {
          timeMin: new Date(Math.min(existingTimeMin.getTime(), incomingTimeMin.getTime())).toISOString(),
          timeMax: new Date(Math.max(existingTimeMax.getTime(), incomingTimeMax.getTime())).toISOString(),
        };
      } else if (incoming.dateRange) {
        result.dateRange = incoming.dateRange;
      } else if (existing.dateRange) {
        result.dateRange = existing.dateRange;
      } else if (args) {
        result.dateRange = {
          timeMin: args.timeMin,
          timeMax: args.timeMax,
        };
      }

      for (const calendarId of Object.keys(incoming.calendars)) {
        if (!result.calendars) {
          result.calendars = {};
        }

        const existingBusyTimes = result.calendars[calendarId]?.busy || [];
        const incomingBusyTimes = incoming.calendars[calendarId]?.busy || [];

        const existingEventsById = new Map();
        const existingEventsWithoutId: typeof existingBusyTimes = [];

        existingBusyTimes.forEach((event) => {
          if (event.id) {
            existingEventsById.set(event.id, event);
          } else {
            existingEventsWithoutId.push(event);
          }
        });

        const updatedEventsWithoutId = [...existingEventsWithoutId];
        incomingBusyTimes.forEach((incomingEvent) => {
          if (incomingEvent.id) {
            if ((incomingEvent as any).source === "cancelled") {
              existingEventsById.delete(incomingEvent.id);
            } else {
              existingEventsById.set(incomingEvent.id, incomingEvent);
            }
          } else if ((incomingEvent as any).source !== "cancelled") {
            const isDuplicate = updatedEventsWithoutId.some(
              (existing) => existing.start === incomingEvent.start && existing.end === incomingEvent.end
            );
            if (!isDuplicate) {
              updatedEventsWithoutId.push(incomingEvent);
            }
          }
        });

        const allEvents = [...Array.from(existingEventsById.values()), ...updatedEventsWithoutId];

        allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        result.calendars[calendarId] = {
          busy: allEvents,
        };
      }

      return result;
    } catch (error) {
      log.warn("Error merging cache values, using new value", { error });
      return newValue as Prisma.InputJsonValue;
    }
  }

  async getCacheStatusByCredentialIds(credentialIds: number[]) {
    const cacheStatuses = await prisma.calendarCache.groupBy({
      by: ["credentialId"],
      where: {
        credentialId: { in: credentialIds },
      },
      _max: {
        updatedAt: true,
      },
    });

    return cacheStatuses.map((cache) => ({
      credentialId: cache.credentialId,
      updatedAt: cache._max.updatedAt,
    }));
  }
}
