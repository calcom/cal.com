const CDN_URL =
  process.env.TIMEZONE_CDN_URL || "https://cdn.jsdelivr.net/npm/city-timezones@1.2.1/data/cityMap.json";

interface CityData {
  city: string;
  city_ascii: string;
  lat: number;
  lng: number;
  pop: number;
  country: string;
  iso2: string;
  iso3: string;
  province: string;
  timezone: string;
}

export type CityTimezone = {
  city: string;
  timezone: string;
  pop: number;
};

export const fetchCityTimezonesFromCDN = async (): Promise<CityTimezone[]> => {
  try {
    const response = await fetch(CDN_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch timezone data: ${response.status}`);
    }
    const allCities: CityData[] = await response.json();

    const topPopulatedCities: { [key: string]: CityTimezone } = {};
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

    uniqueCities.forEach((city) => {
      if (city.city === "London") city.timezone = "Europe/London";
      if (city.city === "Londonderry") city.city = "London";
    });

    return uniqueCities;
  } catch (error) {
    console.error("Failed to fetch city timezones from CDN:", error);
    throw new Error("Unable to load timezone data");
  }
};
