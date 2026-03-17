import dayjs from "@calcom/dayjs";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { HolidayRepository } from "@calcom/features/holidays/repositories/HolidayRepository";

import { GOOGLE_HOLIDAY_CALENDARS, HOLIDAY_CACHE_DAYS } from "./constants";
import {
  getGoogleCalendarClient,
  type GoogleCalendarClient,
  type GoogleCalendarHoliday,
} from "./GoogleCalendarClient";

export interface CachedHoliday {
  id: string;
  countryCode: string;
  eventId: string;
  name: string;
  date: Date;
  year: number;
}

export class HolidayServiceCachingProxy {
  private calendarClient: GoogleCalendarClient;

  constructor(calendarClient?: GoogleCalendarClient) {
    this.calendarClient = calendarClient || getGoogleCalendarClient();
  }

  private async isCacheStale(countryCode: string, year: number): Promise<boolean> {
    const staleDate = dayjs().subtract(HOLIDAY_CACHE_DAYS, "days").toDate();

    const cachedEntry = await HolidayRepository.findFirstCacheEntry({ countryCode, year });

    if (!cachedEntry) {
      return true;
    }

    return cachedEntry.updatedAt < staleDate;
  }

  private async refreshCache(countryCode: string, year: number): Promise<void> {
    const calendarConfig = GOOGLE_HOLIDAY_CALENDARS[countryCode];
    if (!calendarConfig) {
      return;
    }

    try {
      const holidays = await this.calendarClient.fetchHolidays(countryCode, year);

      await HolidayRepository.refreshCache({
        countryCode,
        year,
        holidays: holidays.map((h: GoogleCalendarHoliday) => ({
          countryCode: h.countryCode,
          calendarId: calendarConfig.calendarId,
          eventId: h.eventId,
          name: h.name,
          date: h.date,
          year: h.year,
        })),
      });
    } catch (error) {
      console.error(`Failed to refresh holiday cache for ${countryCode}:`, error);
    }
  }

  private toCachedHoliday(h: {
    id: string;
    countryCode: string;
    eventId: string;
    name: string;
    date: Date;
    year: number;
  }): CachedHoliday {
    return {
      id: h.id,
      countryCode: h.countryCode,
      eventId: h.eventId,
      name: h.name,
      date: h.date,
      year: h.year,
    };
  }

  async getHolidaysForCountry(countryCode: string, year: number): Promise<CachedHoliday[]> {
    const isStale = await this.isCacheStale(countryCode, year);

    if (isStale) {
      await this.refreshCache(countryCode, year);
    }

    const cached = await HolidayRepository.findManyCachedHolidays({ countryCode, year });

    return cached.map((h) => this.toCachedHoliday(h));
  }

  async getHolidaysInRange(countryCode: string, startDate: Date, endDate: Date): Promise<CachedHoliday[]> {
    const startYear = dayjs(startDate).year();
    const endYear = dayjs(endDate).year();

    for (let year = startYear; year <= endYear; year++) {
      const isStale = await this.isCacheStale(countryCode, year);
      if (isStale) {
        await this.refreshCache(countryCode, year);
      }
    }

    const cached = await HolidayRepository.findCachedHolidaysInRange({
      countryCode,
      startDate,
      endDate,
    });

    return cached.map((h) => this.toCachedHoliday(h));
  }

  async getHolidaysInRangeForCountries({
    countryCodes,
    startDate,
    endDate,
  }: {
    countryCodes: string[];
    startDate: Date;
    endDate: Date;
  }): Promise<Map<string, CachedHoliday[]>> {
    const startYear = dayjs(startDate).year();
    const endYear = dayjs(endDate).year();

    // TODO: Move cache refresh to a background job (e.g. Trigger.dev cron) so the critical
    // path never pays for a Google Calendar API call. Currently, the unlucky request that
    // hits a stale cache adds ~300ms+ per country per year of external API latency.
    await Promise.all(
      countryCodes.flatMap((cc) => {
        const refreshPromises: Promise<void>[] = [];
        for (let year = startYear; year <= endYear; year++) {
          refreshPromises.push(
            this.isCacheStale(cc, year).then((isStale) => {
              if (isStale) return this.refreshCache(cc, year);
            })
          );
        }
        return refreshPromises;
      })
    );

    const cached = await HolidayRepository.findCachedHolidaysInRangeForCountries({
      countryCodes,
      startDate,
      endDate,
    });

    const byCountry = new Map<string, CachedHoliday[]>();
    for (const h of cached) {
      const entry = this.toCachedHoliday(h);
      const list = byCountry.get(h.countryCode);
      if (list) {
        list.push(entry);
      } else {
        byCountry.set(h.countryCode, [entry]);
      }
    }
    return byCountry;
  }
}

let defaultProxy: HolidayServiceCachingProxy | null = null;

export function getHolidayServiceCachingProxy(): HolidayServiceCachingProxy {
  if (!defaultProxy) {
    defaultProxy = new HolidayServiceCachingProxy();
  }
  return defaultProxy;
}
