// Import JSON directly - bundler will handle this efficiently
import holidayData from "./data/holidays.json";
import type { Country, Holiday, HolidayData, HolidayWithStatus } from "./types";

/**
 * HolidayService provides methods to work with holiday data.
 * Uses static import for optimal bundling - no runtime file reading.
 */
class HolidayServiceClass {
  private data: HolidayData;

  constructor() {
    this.data = holidayData as HolidayData;
  }

  /**
   * Get list of supported countries
   */
  getSupportedCountries(): Country[] {
    return this.data.countries.map((c) => ({
      code: c.code,
      name: c.name,
    }));
  }

  /**
   * Get all holidays for a specific country
   */
  getHolidaysForCountry(countryCode: string): Holiday[] {
    const country = this.data.countries.find((c) => c.code === countryCode);
    return country?.holidays || [];
  }

  /**
   * Get holidays with enabled status for a user
   */
  getHolidaysWithStatus(countryCode: string, disabledIds: string[]): HolidayWithStatus[] {
    const holidays = this.getHolidaysForCountry(countryCode);
    const disabledSet = new Set(disabledIds);

    return holidays.map((holiday) => ({
      ...holiday,
      enabled: !disabledSet.has(holiday.id),
      nextDate: this.getNextOccurrence(holiday),
    }));
  }

  /**
   * Get the next occurrence date for a holiday
   */
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

  /**
   * Get the date for a specific holiday in a specific year
   */
  getHolidayDate(holidayId: string, countryCode: string, year: number): string | null {
    const holidays = this.getHolidaysForCountry(countryCode);
    const holiday = holidays.find((h) => h.id === holidayId);

    if (!holiday) return null;

    const dateInfo = holiday.dates.find((d) => d.year === year);
    return dateInfo?.date || null;
  }

  /**
   * Check if a specific date is a holiday for a given country
   * Returns the holiday info if it is, null otherwise
   */
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

  /**
   * Get all holiday dates within a date range for a country
   * Returns array of { date, holiday } objects
   */
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

    // Sort by date
    return results.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Check if any enabled holidays exist in a date range
   */
  hasHolidaysInRange(countryCode: string, disabledIds: string[], startDate: Date, endDate: Date): boolean {
    return this.getHolidayDatesInRange(countryCode, disabledIds, startDate, endDate).length > 0;
  }

  /**
   * Get years included in the data
   */
  getYearsIncluded(): number[] {
    return this.data.yearsIncluded;
  }
}

// Export singleton instance
export const HolidayService = new HolidayServiceClass();

// Also export class for testing
export { HolidayServiceClass };
