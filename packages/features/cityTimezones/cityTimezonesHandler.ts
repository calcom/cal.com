import { cityMapping as allCities } from "city-timezones";

export type CityTimezones = Awaited<ReturnType<typeof cityTimezonesHandler>>;

export const cityTimezonesHandler = async () => {
  /**
   * Filter out all cities that have the same "city" key and only use the one with the highest population.
   * This way we return a new array of cities without running the risk of having more than one city
   * with the same name on the dropdown and prevent users from mistaking the time zone of the desired city.
   */
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
  /** Add specific overries in here */
  uniqueCities.forEach((city) => {
    if (city.city === "London") city.timezone = "Europe/London";
    if (city.city === "Londonderry") city.city = "London";
  });

  return uniqueCities;
};

export default cityTimezonesHandler;
