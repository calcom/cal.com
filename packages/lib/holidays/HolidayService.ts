import holidayData from "./data/holidays.json";
import type { Country, Holiday, HolidayData, HolidayWithStatus } from "./types";

class HolidayServiceClass {
  private data: HolidayData;
  private countriesCache: Country[] | null = null;
  private holidaysByCountryCache: Map<string, Holiday[]> = new Map();

  constructor() {
    this.data = holidayData as HolidayData;
  }

  getSupportedCountries(): Country[] {
    if (this.countriesCache) {
      return this.countriesCache;
    }

    this.countriesCache = this.data.countries.map((c) => ({
      code: c.code,
      name: c.name,
    }));

    return this.countriesCache;
  }

  getHolidaysForCountry(countryCode: string): Holiday[] {
    const cached = this.holidaysByCountryCache.get(countryCode);
    if (cached) {
      return cached;
    }

    const country = this.data.countries.find((c) => c.code === countryCode);
    const holidays = country?.holidays || [];

    this.holidaysByCountryCache.set(countryCode, holidays);
    return holidays;
  }

  getHolidaysWithStatus(countryCode: string, disabledIds: string[]): HolidayWithStatus[] {
    const holidays = this.getHolidaysForCountry(countryCode);
    const disabledSet = new Set(disabledIds);

    return holidays.map((holiday) => ({
      ...holiday,
      enabled: !disabledSet.has(holiday.id),
      nextDate: this.getNextOccurrence(holiday),
    }));
  }

  getNextOccurrence(holiday: Holiday): string | null {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const dateInfo of holiday.dates) {
      const holidayDate = new Date(dateInfo.date);
      if (holidayDate >= today) {
        return dateInfo.date;
      }
    }

    return null;
  }

  getHolidayDate(holidayId: string, countryCode: string, year: number): string | null {
    const holidays = this.getHolidaysForCountry(countryCode);
    const holiday = holidays.find((h) => h.id === holidayId);

    if (!holiday) return null;

    const dateInfo = holiday.dates.find((d) => d.year === year);
    return dateInfo?.date || null;
  }

  getHolidayOnDate(date: Date, countryCode: string, disabledIds: string[] = []): Holiday | null {
    const holidays = this.getHolidaysForCountry(countryCode);
    const dateStr = date.toISOString().split("T")[0];
    const disabledSet = new Set(disabledIds);

    for (const holiday of holidays) {
      if (disabledSet.has(holiday.id)) continue;

      for (const dateInfo of holiday.dates) {
        if (dateInfo.date === dateStr) {
          return holiday;
        }
      }
    }

    return null;
  }

  getHolidayDatesInRange(
    countryCode: string,
    disabledIds: string[],
    startDate: Date,
    endDate: Date
  ): Array<{ date: string; holiday: Holiday }> {
    const holidays = this.getHolidaysForCountry(countryCode);
    const disabledSet = new Set(disabledIds);
    const results: Array<{ date: string; holiday: Holiday }> = [];

    const start = startDate.toISOString().split("T")[0];
    const end = endDate.toISOString().split("T")[0];

    for (const holiday of holidays) {
      if (disabledSet.has(holiday.id)) continue;

      for (const dateInfo of holiday.dates) {
        if (dateInfo.date >= start && dateInfo.date <= end) {
          results.push({
            date: dateInfo.date,
            holiday,
          });
        }
      }
    }

    return results.sort((a, b) => a.date.localeCompare(b.date));
  }

  hasHolidaysInRange(countryCode: string, disabledIds: string[], startDate: Date, endDate: Date): boolean {
    return this.getHolidayDatesInRange(countryCode, disabledIds, startDate, endDate).length > 0;
  }

  getYearsIncluded(): number[] {
    return this.data.yearsIncluded;
  }
}

export const HolidayService = new HolidayServiceClass();

export { HolidayServiceClass };
