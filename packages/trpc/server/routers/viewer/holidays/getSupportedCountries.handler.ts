import { getHolidayService } from "@calcom/lib/holidays/HolidayService";

export async function getSupportedCountriesHandler() {
  const holidayService = getHolidayService();
  return holidayService.getSupportedCountries();
}

export default getSupportedCountriesHandler;
