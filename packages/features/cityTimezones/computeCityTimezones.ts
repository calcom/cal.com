import { createHash } from "node:crypto";
import { cityMapping as allCities } from "city-timezones";

/**
 * Computes the filtered city timezone data synchronously.
 * This is the single source of truth for city timezone computation,
 * used both at build time (for hashing) and at runtime (for serving).
 */
export function computeCityTimezones(): { city: string; timezone: string; pop: number }[] {
  const topPopulatedCities: { [key: string]: { city: string; timezone: string; pop: number } } = {};
  allCities.forEach((city) => {
    const cityPopulationCount = city.pop;
    if (
      topPopulatedCities[city.city]?.pop === undefined ||
      cityPopulationCount > topPopulatedCities[city.city].pop
    ) {
      topPopulatedCities[city.city] = { city: city.city, timezone: city.timezone, pop: city.pop };
    }
  });
  const uniqueCities = Object.values(topPopulatedCities);
  /** Add specific overrides in here */
  uniqueCities.forEach((city) => {
    if (city.city === "London") city.timezone = "Europe/London";
    if (city.city === "Londonderry") city.city = "London";
  });

  return uniqueCities;
}

/**
 * Computes a SHA-256 content hash of the city timezone data.
 * Returns the first 8 hex characters of the hash.
 *
 * This hash only changes when:
 * - The `city-timezones` npm package is updated
 * - The filtering/override logic in `computeCityTimezones` changes
 *
 * Used at build time to set NEXT_PUBLIC_CITY_TIMEZONE_HASH and at
 * runtime to validate incoming hash parameters.
 */
export function computeCityTimezonesHash(): string {
  const data = computeCityTimezones();
  return createHash("sha256").update(JSON.stringify(data)).digest("hex").slice(0, 8);
}
