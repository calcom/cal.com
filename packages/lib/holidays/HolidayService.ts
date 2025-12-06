import dayjs from "@calcom/dayjs";

import { GOOGLE_HOLIDAY_CALENDARS } from "./constants";
import { GoogleHolidayService, type CachedHoliday } from "./GoogleHolidayService";
import type { Country, Holiday, HolidayWithStatus } from "./types";

class HolidayServiceClass {
  private countriesCache: Country[] | null = null;

  getSupportedCountries(): Country[] {
    if (this.countriesCache) {
      return this.countriesCache;
    }

    this.countriesCache = Object.entries(GOOGLE_HOLIDAY_CALENDARS).map(([code, config]) => ({
      code,
      name: config.name,
    }));

    return this.countriesCache;
  }

  private cachedHolidayToHoliday(cached: CachedHoliday): Holiday {
    return {
      id: cached.eventId,
      name: cached.name,
      date: dayjs(cached.date).format("YYYY-MM-DD"),
      year: cached.year,
    };
  }

  async getHolidaysForCountry(countryCode: string, year?: number): Promise<Holiday[]> {
    const targetYear = year || dayjs().year();
    const cached = await GoogleHolidayService.getHolidaysForCountry(countryCode, targetYear);
    return cached.map(this.cachedHolidayToHoliday);
  }

  async getHolidaysWithStatus(countryCode: string, disabledIds: string[]): Promise<HolidayWithStatus[]> {
    const currentYear = dayjs().year();
    const nextYear = currentYear + 1;

    const [currentYearHolidays, nextYearHolidays] = await Promise.all([
      GoogleHolidayService.getHolidaysForCountry(countryCode, currentYear),
      GoogleHolidayService.getHolidaysForCountry(countryCode, nextYear),
    ]);

    const allHolidays = [...currentYearHolidays, ...nextYearHolidays];
    const disabledSet = new Set(disabledIds);
    const today = dayjs().startOf("day");

    return allHolidays
      .filter((h) => dayjs(h.date).isAfter(today) || dayjs(h.date).isSame(today))
      .map((h) => ({
        id: h.eventId,
        name: h.name,
        date: dayjs(h.date).format("YYYY-MM-DD"),
        year: h.year,
        enabled: !disabledSet.has(h.eventId),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getHolidayOnDate(
    date: Date,
    countryCode: string,
    disabledIds: string[] = []
  ): Promise<Holiday | null> {
    const year = dayjs(date).year();
    const dateStr = dayjs(date).format("YYYY-MM-DD");
    const disabledSet = new Set(disabledIds);

    const holidays = await GoogleHolidayService.getHolidaysForCountry(countryCode, year);

    for (const holiday of holidays) {
      if (disabledSet.has(holiday.eventId)) continue;

      if (dayjs(holiday.date).format("YYYY-MM-DD") === dateStr) {
        return this.cachedHolidayToHoliday(holiday);
      }
    }

    return null;
  }

  async getHolidayDatesInRange(
    countryCode: string,
    disabledIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; holiday: Holiday }>> {
    const disabledSet = new Set(disabledIds);

    const holidays = await GoogleHolidayService.getHolidaysInRange(countryCode, startDate, endDate);

    return holidays
      .filter((h) => !disabledSet.has(h.eventId))
      .map((h) => ({
        date: dayjs(h.date).format("YYYY-MM-DD"),
        holiday: this.cachedHolidayToHoliday(h),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async hasHolidaysInRange(
    countryCode: string,
    disabledIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const holidays = await this.getHolidayDatesInRange(countryCode, disabledIds, startDate, endDate);
    return holidays.length > 0;
  }
}

export const HolidayService = new HolidayServiceClass();

export { HolidayServiceClass };
