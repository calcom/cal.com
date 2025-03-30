import type { Prisma } from "@prisma/client";

import { uniqueBy } from "@calcom/lib/array";
import { isDelegationCredential } from "@calcom/lib/delegationCredential/clientAndServer";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { Calendar, SelectedCalendarEventTypeIds } from "@calcom/types/Calendar";

import type {
  ICalendarCacheRepository,
  DelegationCredentialArgs,
  CredentialArgs,
} from "./calendar-cache.repository.interface";
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

const validatedDelegationUserCredential = ({ userId, delegationCredentialId }: DelegationCredentialArgs) => {
  if (!userId || !delegationCredentialId) {
    return null;
  }

  return {
    userId,
    delegationCredentialId,
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
    delegationUserCredential,
    key,
  }: {
    credentialId: number | null;
    delegationUserCredential: { delegationCredentialId: string; userId: number } | null;
    key: string;
  }) {
    log.debug("findUnique", safeStringify({ credentialId, delegationUserCredential, key }));
    if (delegationUserCredential) {
      const calendarCaches = await prisma.calendarCache.findMany({
        where: {
          delegationCredentialId: delegationUserCredential.delegationCredentialId,
          userId: delegationUserCredential.userId,
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
      log.error("findUnique: No credentialId or delegationCredentialId provided");
      return null;
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
    const delegationUserCredential = validatedDelegationUserCredential({ userId, delegationCredentialId });
    const cached = await this.findUnique({ credentialId, delegationUserCredential, key });
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
    const delegationCredential = validatedDelegationUserCredential({ userId, delegationCredentialId });
    let where;
    if (delegationCredential) {
      where = {
        delegationCredentialId: delegationCredential.delegationCredentialId,
        userId: delegationCredential.userId,
        key,
      };
    } else if (credentialId) {
      if (isDelegationCredential({ credentialId })) {
        log.error("upsertCachedAvailability: delegationCredential seems to be invalid");
        return;
      }
      where = {
        credentialId,
        key,
      };
    } else {
      log.error("upsertCachedAvailability: No credentialId or delegationCredential provided");
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
          credentialId: isDelegationCredential({ credentialId }) ? null : credentialId,
          delegationCredentialId: delegationCredential?.delegationCredentialId ?? null,
          userId: delegationCredential?.userId ?? null,
          value,
          expiresAt: new Date(Date.now() + CACHING_TIME),
        },
      });
    }
  }

  async deleteManyByCredential({ delegationCredentialId, credentialId, userId }: CredentialArgs) {
    const delegationCredential = validatedDelegationUserCredential({ userId, delegationCredentialId });

    if (delegationCredential) {
      await prisma.calendarCache.deleteMany({
        where: {
          delegationCredentialId: delegationCredential.delegationCredentialId,
          userId: delegationCredential.userId,
        },
      });
    } else if (credentialId) {
      if (isDelegationCredential({ credentialId })) {
        log.error("deleteMany: delegationCredential seems to be invalid");
        return;
      }
      await prisma.calendarCache.deleteMany({
        where: {
          credentialId,
        },
      });
    } else {
      log.error("deleteMany: No credentialId or delegationCredentialId provided");
      return;
    }
  }
}
