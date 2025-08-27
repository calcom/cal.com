import { TimezoneService } from "@calcom/lib/timezone-service";

export const cityTimezones = {
  async lookupViaCity(cityName: string) {
    try {
      const timezones = await TimezoneService.getCityTimezones();
      const city = timezones.find((tz) => tz.city.toLowerCase() === cityName.toLowerCase());
      return city ? [{ timezone: city.timezone }] : [];
    } catch (error) {
      console.error("Failed to lookup city timezone:", error);
      return [];
    }
  },

  async getAllTimezones() {
    try {
      return await TimezoneService.getCityTimezones();
    } catch (error) {
      console.error("Failed to get all timezones:", error);
      return [];
    }
  },
};

export default cityTimezones;
