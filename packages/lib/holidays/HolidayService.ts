import dayjs from "@calcom/dayjs";
import { HolidayRepository } from "@calcom/lib/server/repository/HolidayRepository";

import {
  getHolidayServiceCachingProxy,
  type CachedHoliday,
  type HolidayServiceCachingProxy,
} from "./HolidayServiceCachingProxy";
import { CONFLICT_CHECK_MONTHS, GOOGLE_HOLIDAY_CALENDARS } from "./constants";
import type { Country, Holiday, HolidayWithStatus } from "./types";

export interface ConflictingBooking {
  id: number;
  title: string;
  startTime: Date;
  endTime: Date;
  attendeeName: string | null;
}

export interface HolidayConflict {
  holidayId: string;
  holidayName: string;
  date: string;
  bookings: ConflictingBooking[];
}

export class HolidayService {
  private cachingProxy: HolidayServiceCachingProxy;
  private countriesCache: Country[] | null = null;

  constructor(cachingProxy?: HolidayServiceCachingProxy) {
    this.cachingProxy = cachingProxy || getHolidayServiceCachingProxy();
  }

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

  isSupportedCountry(countryCode: string): boolean {
    return countryCode in GOOGLE_HOLIDAY_CALENDARS;
  }

  async getUserSettings(
    userId: number
  ): Promise<{ countryCode: string | null; holidays: HolidayWithStatus[] }> {
    const settings = await HolidayRepository.findUserSettingsSelect({
      userId,
      select: { countryCode: true, disabledIds: true },
    });

    if (!settings?.countryCode) {
      return { countryCode: null, holidays: [] };
    }

    const holidays = await this.getHolidaysWithStatus(settings.countryCode, settings.disabledIds);
    return { countryCode: settings.countryCode, holidays };
  }

  async updateSettings(
    userId: number,
    countryCode: string | null,
    resetDisabledHolidays: boolean
  ): Promise<{ countryCode: string | null; holidays: HolidayWithStatus[] }> {
    if (countryCode && !this.isSupportedCountry(countryCode)) {
      throw new Error("Invalid country code");
    }

    const settings = await HolidayRepository.upsertUserSettings({
      userId,
      countryCode,
      resetDisabledHolidays,
    });

    if (settings.countryCode) {
      const holidays = await this.getHolidaysWithStatus(settings.countryCode, settings.disabledIds);
      return { countryCode: settings.countryCode, holidays };
    }

    return { countryCode: null, holidays: [] };
  }

  private cachedHolidayToHoliday(cached: CachedHoliday): Holiday {
    return {
      id: cached.eventId,
      name: cached.name,
      // Use UTC to ensure consistent date formatting regardless of server timezone
      // Holiday dates are stored as UTC midnight (e.g., 2025-12-25T00:00:00.000Z)
      date: dayjs(cached.date).utc().format("YYYY-MM-DD"),
      year: cached.year,
    };
  }

  async getHolidaysForCountry(countryCode: string, year?: number): Promise<Holiday[]> {
    const targetYear = year || dayjs().year();
    const cached = await this.cachingProxy.getHolidaysForCountry(countryCode, targetYear);
    return cached.map((h) => this.cachedHolidayToHoliday(h));
  }

  async getHolidaysWithStatus(countryCode: string, disabledIds: string[]): Promise<HolidayWithStatus[]> {
    const currentYear = dayjs().year();
    const nextYear = currentYear + 1;

    const [currentYearHolidays, nextYearHolidays] = await Promise.all([
      this.cachingProxy.getHolidaysForCountry(countryCode, currentYear),
      this.cachingProxy.getHolidaysForCountry(countryCode, nextYear),
    ]);

    const allHolidays = [...currentYearHolidays, ...nextYearHolidays];
    const disabledSet = new Set(disabledIds);
    const today = dayjs().utc().startOf("day");

    return allHolidays
      .filter((h) => dayjs(h.date).utc().isAfter(today) || dayjs(h.date).utc().isSame(today))
      .map((h) => ({
        id: h.eventId,
        name: h.name,
        // Use UTC for consistent date formatting
        date: dayjs(h.date).utc().format("YYYY-MM-DD"),
        year: h.year,
        enabled: !disabledSet.has(h.eventId),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Checks if a given date falls on a holiday for a specific country.
   *
   * @param date - The date to check (typically booking start time)
   * @param countryCode - The country code to check holidays for
   * @param disabledIds - Array of holiday IDs that have been disabled by the user
   * @param hostTimeZone - The host's timezone. The date will be converted to this timezone
   *                       before checking against holidays. This is important because a holiday
   *                       like "December 25th" should be checked in the host's local time,
   *                       not UTC. For example, a booking at Dec 24th 11PM UTC is actually
   *                       Dec 25th in IST (UTC+5:30), so it should be blocked for an Indian host.
   * @returns The holiday if found, null otherwise
   */
  async getHolidayOnDate(
    date: Date,
    countryCode: string,
    disabledIds: string[] = [],
    hostTimeZone: string
  ): Promise<Holiday | null> {
    // Convert the booking time to the host's timezone to get the correct calendar date
    const dateInHostTz = dayjs(date).tz(hostTimeZone);
    const year = dateInHostTz.year();
    const dateStr = dateInHostTz.format("YYYY-MM-DD");
    const disabledSet = new Set(disabledIds);

    const holidays = await this.cachingProxy.getHolidaysForCountry(countryCode, year);

    for (const holiday of holidays) {
      if (disabledSet.has(holiday.eventId)) continue;

      // Holiday dates are stored as UTC midnight, so use UTC for consistent formatting
      const holidayDateStr = dayjs(holiday.date).utc().format("YYYY-MM-DD");
      if (holidayDateStr === dateStr) {
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

    const holidays = await this.cachingProxy.getHolidaysInRange(countryCode, startDate, endDate);

    return holidays
      .filter((h) => !disabledSet.has(h.eventId))
      .map((h) => ({
        // Use UTC for consistent date formatting
        date: dayjs(h.date).utc().format("YYYY-MM-DD"),
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

  async toggleHoliday(
    userId: number,
    holidayId: string,
    enabled: boolean
  ): Promise<{ countryCode: string; holidays: HolidayWithStatus[] }> {
    const settings = await HolidayRepository.findUserSettingsSelect({
      userId,
      select: { countryCode: true, disabledIds: true },
    });

    if (!settings?.countryCode) {
      throw new Error("No holiday country selected");
    }

    const holidays = await this.getHolidaysForCountry(settings.countryCode);
    if (!holidays.some((h) => h.id === holidayId)) {
      throw new Error("Holiday not found for this country");
    }

    let disabledIds = [...settings.disabledIds];
    if (enabled) {
      disabledIds = disabledIds.filter((id) => id !== holidayId);
    } else if (!disabledIds.includes(holidayId)) {
      disabledIds.push(holidayId);
    }

    await HolidayRepository.updateDisabledIds({ userId, disabledIds });

    const updatedHolidays = await this.getHolidaysWithStatus(settings.countryCode, disabledIds);
    return { countryCode: settings.countryCode, holidays: updatedHolidays };
  }

  async checkConflicts(
    userId: number,
    countryCode: string,
    disabledIds: string[]
  ): Promise<{ conflicts: HolidayConflict[] }> {
    if (!countryCode) {
      return { conflicts: [] };
    }

    const startDate = new Date();
    const endDate = dayjs().add(CONFLICT_CHECK_MONTHS, "months").toDate();

    const holidayDates = await this.getHolidayDatesInRange(countryCode, disabledIds, startDate, endDate);
    if (holidayDates.length === 0) {
      return { conflicts: [] };
    }

    const dateRanges = holidayDates.map((h) => ({
      start: dayjs(h.date).startOf("day").toDate(),
      end: dayjs(h.date).endOf("day").toDate(),
    }));

    const bookings = await HolidayRepository.findBookingsInDateRanges({ userId, dateRanges });
    if (bookings.length === 0) {
      return { conflicts: [] };
    }

    const bookingsWithTimestamps = bookings.map((b) => ({
      ...b,
      startTimestamp: b.startTime.getTime(),
      endTimestamp: b.endTime.getTime(),
    }));

    const conflicts: HolidayConflict[] = [];

    for (const holidayDate of holidayDates) {
      const holidayStart = dayjs(holidayDate.date).startOf("day").valueOf();
      const holidayEnd = dayjs(holidayDate.date).endOf("day").valueOf();

      const conflictingBookings = bookingsWithTimestamps.filter(
        (booking) => booking.startTimestamp < holidayEnd && booking.endTimestamp > holidayStart
      );

      if (conflictingBookings.length > 0) {
        conflicts.push({
          holidayId: holidayDate.holiday.id,
          holidayName: holidayDate.holiday.name,
          date: holidayDate.date,
          bookings: conflictingBookings.map((b) => ({
            id: b.id,
            title: b.title,
            startTime: b.startTime,
            endTime: b.endTime,
            attendeeName: b.attendees[0]?.name || null,
          })),
        });
      }
    }

    return { conflicts };
  }
}

let defaultService: HolidayService | null = null;

export function getHolidayService(): HolidayService {
  if (!defaultService) {
    defaultService = new HolidayService();
  }
  return defaultService;
}
