export type CityRow = {
  city: string;
  timezone: string;
  pop: number;
};

const TIMEZONE_LIST_CDN_URL = "https://cdn.jsdelivr.net/npm/city-timezones@1.2.1/data/cityMap.json";

export async function cityTimezonesHandler(): Promise<CityRow[]> {
  const res = await fetch(TIMEZONE_LIST_CDN_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch city map: ${res.status} ${res.statusText}`);
  }

  const allCities: CityRow[] = await res.json();
  const topByName: Record<string, CityRow> = {};

  for (const raw of allCities) {
    let { city, timezone } = raw;

    // Replace Londonberry with London
    if (city === "Londonderry") {
      city = "London";
      timezone = "Europe/London";
    }

    const candidate: CityRow = { city, timezone, pop: raw.pop };
    const prev = topByName[city];

    // Dedupe and pick city with highest population
    if (!prev || candidate.pop > prev.pop) {
      topByName[city] = candidate;
    }
  }

  const uniqueCities = Object.values(topByName);
  return uniqueCities;
}

export type CityTimezones = Awaited<ReturnType<typeof cityTimezonesHandler>>;

export default cityTimezonesHandler;
