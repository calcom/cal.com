import type { Prisma } from "@prisma/client";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import prisma from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { Calendar } from "@calcom/types/Calendar";

import { CalendarCacheRepository } from "./calendar-cache.repository";
import type { ICalendarCacheRepository } from "./calendar-cache.repository.interface";
import { CalendarCacheRepositoryMock } from "./calendar-cache.repository.mock";

/**
 * Enable or disable the expanded cache
 * TODO: Make this configurable
 * */
// eslint-disable-next-line turbo/no-undeclared-env-vars
const ENABLE_EXPANDED_CACHE = process.env.ENABLE_EXPANDED_CACHE === "true";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ONE_MONTH_IN_MS = 30 * MS_PER_DAY;
const CACHING_TIME = ONE_MONTH_IN_MS;

/** Expand the start date to the start of the month */
export function getTimeMin(timeMin: string) {
  const dateMin = new Date(timeMin);
  return new Date(dateMin.getFullYear(), dateMin.getMonth(), 1, 0, 0, 0, 0).toISOString();
}

/** Expand the end date to the end of the month */
export function getTimeMax(timeMax: string) {
  const dateMax = new Date(timeMax);
  return new Date(dateMax.getFullYear(), dateMax.getMonth() + 1, 0, 0, 0, 0, 0).toISOString();
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

export class CalendarCache {
  static async initFromCredentialId(credentialId: number): Promise<ICalendarCacheRepository> {
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId },
      select: credentialForCalendarServiceSelect,
    });
    const calendar = await getCalendar(credential);
    return await CalendarCache.init(calendar);
  }
  static async init(calendar: Calendar | null): Promise<ICalendarCacheRepository> {
    const featureRepo = new FeaturesRepository();
    const isCalendarCacheEnabledGlobally = await featureRepo.checkIfFeatureIsEnabledGlobally(
      "calendar-cache"
    );
    if (isCalendarCacheEnabledGlobally) return new CalendarCacheRepository(calendar);
    return new CalendarCacheRepositoryMock();
  }
  static parseKeyForCache(args: FreeBusyArgs): string {
    const { timeMin: _timeMin, timeMax: _timeMax, items } = args;
    const { timeMin, timeMax } = handleMinMax(_timeMin, _timeMax);
    const key = JSON.stringify({ timeMin, timeMax, items });
    return key;
  }
  static async getCachedAvailability(credentialId: number, args: FreeBusyArgs) {
    const key = CalendarCache.parseKeyForCache(args);
    console.log("Getting cached availability", key);
    const cached = await prisma.calendarCache.findUnique({
      where: {
        credentialId_key: {
          credentialId,
          key,
        },
        expiresAt: { gte: new Date(Date.now()) },
      },
    });
    return cached;
  }
  static async upsertCachedAvailability(
    credentialId: number,
    args: FreeBusyArgs,
    value: Prisma.JsonNullValueInput | Prisma.InputJsonValue
  ) {
    const key = CalendarCache.parseKeyForCache(args);
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
