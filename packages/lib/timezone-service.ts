import { fetchCityTimezonesFromCDN } from "./timezone-cdn";
import type { CityTimezone } from "./timezone-cdn";

export class TimezoneService {
  private static cachedTimezones: CityTimezone[] | null = null;
  private static cacheExpiry = 0;
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000;

  static async getCityTimezones(): Promise<CityTimezone[]> {
    const now = Date.now();

    if (this.cachedTimezones && now < this.cacheExpiry) {
      return TimezoneService.cachedTimezones;
    }

    try {
      this.cachedTimezones = await fetchCityTimezonesFromCDN();
      this.cacheExpiry = now + this.CACHE_DURATION;
      return TimezoneService.cachedTimezones;
    } catch (error) {
      console.error("Failed to fetch city timezones:", error);
      if (this.cachedTimezones) {
        return TimezoneService.cachedTimezones;
      }
      throw error;
    }
  }
}
