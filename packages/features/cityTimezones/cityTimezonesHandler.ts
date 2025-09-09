type TimezoneCityRow = {
  city: string;
  timezone: string;
  pop: number;
};

export const TIMEZONE_LIST_CDN_URL =
  process.env.NEXT_PUBLIC_CITY_TIMEZONES_URL ??
  "https://cdn.jsdelivr.net/npm/city-timezones@1.2.1/data/cityMap.json";

export async function cityTimezonesHandler(): Promise<TimezoneCityRow[]> {
  const res = await fetch(TIMEZONE_LIST_CDN_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch city map: ${res.status} ${res.statusText}`);
  }

  const allCities: TimezoneCityRow[] = await res.json();
  const topByName: Record<string, TimezoneCityRow> = {};

  for (const raw of allCities) {
    const { city, timezone } = raw;

    const candidate: TimezoneCityRow = { city, timezone, pop: raw.pop };
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
