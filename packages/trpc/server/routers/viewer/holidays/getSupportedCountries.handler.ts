import { HolidayService } from "@calcom/lib/holidays";

export async function getSupportedCountriesHandler() {
  return HolidayService.getSupportedCountries();
}

export default getSupportedCountriesHandler;
