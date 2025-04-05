import type { Prisma } from "@prisma/client";

import { uniqueBy } from "@calcom/lib/array";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getUserCredential } from "@calcom/lib/service/credential/getUserCredential";
import prisma from "@calcom/prisma";
import type { Calendar, SelectedCalendarEventTypeIds } from "@calcom/types/Calendar";

import type { ICalendarCacheRepository, CredentialArgs } from "./calendar-cache.repository.interface";
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

  async findUnexpiredUnique({
    credentialId,
    delegationCredentialId,
    userId,
    key,
  }: {
    credentialId: number | null;
    delegationCredentialId: string | null;
    userId: number | null;
    key: string;
  }) {
    log.debug("findUnexpiredUnique", safeStringify({ credentialId, delegationCredentialId, userId, key }));
    const credential = getUserCredential({ userId, delegationCredentialId, credentialId });
    if (!credential) {
      return null;
    }
    if (credential.type === "delegation") {
      const calendarCaches = await prisma.calendarCache.findMany({
        where: {
          delegationCredentialId: credential.delegationCredentialId,
          userId: credential.userId,
          key,
          expiresAt: { gte: new Date(Date.now()) },
        },
      });
      return calendarCaches[0] ?? null;
    } else {
      return prisma.calendarCache.findFirst({
        where: {
          credentialId: credential.credentialId,
          key,
          expiresAt: { gte: new Date(Date.now()) },
        },
      });
    }
  }

  async getCachedAvailability({
    credentialId,
    delegationCredentialId,
    userId,
    args,
  }: CredentialArgs & {
    args: FreeBusyArgs;
  }) {
    log.debug("getCachedAvailability", safeStringify({ credentialId, delegationCredentialId, userId, args }));
    const key = parseKeyForCache(args);
    const cached = await this.findUnexpiredUnique({ credentialId, delegationCredentialId, userId, key });
    log.info("Cached availability result", safeStringify({ key, cached }));
    return cached;
  }
  async upsertCachedAvailability({
    delegationCredentialId,
    userId,
    credentialId,
    args,
    value,
  }: {
    delegationCredentialId: string | null;
    userId: number | null;
    credentialId: number | null;
    args: FreeBusyArgs;
    value: Prisma.JsonNullValueInput | Prisma.InputJsonValue;
  }) {
    log.debug(
      "upsertCachedAvailability",
      safeStringify({ delegationCredentialId, userId, credentialId, args, value })
    );
    const key = parseKeyForCache(args);
    const credential = getUserCredential({ userId, delegationCredentialId, credentialId });
    if (!credential) {
      return;
    }
    let where;
    if (credential.type === "delegation") {
      where = {
        delegationCredentialId: credential.delegationCredentialId,
        userId: credential.userId,
        key,
      };
    } else {
      where = {
        credentialId: credential.credentialId,
        key,
      };
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
      const credentialData =
        credential.type === "credential"
          ? { credentialId: credential.credentialId }
          : { delegationCredentialId: credential.delegationCredentialId };

      await prisma.calendarCache.create({
        data: {
          key,
          ...credentialData,
          userId: credential.userId,
          value,
          expiresAt: new Date(Date.now() + CACHING_TIME),
        },
      });
    }
  }

  async deleteManyByCredential({ delegationCredentialId, credentialId, userId }: CredentialArgs) {
    const credential = getUserCredential({ userId, delegationCredentialId, credentialId });
    if (!credential) {
      return;
    }

    if (credential.type === "delegation") {
      await prisma.calendarCache.deleteMany({
        where: {
          delegationCredentialId: credential.delegationCredentialId,
          userId: credential.userId,
        },
      });
    } else {
      await prisma.calendarCache.deleteMany({
        where: {
          credentialId: credential.credentialId,
        },
      });
    }
  }
}
