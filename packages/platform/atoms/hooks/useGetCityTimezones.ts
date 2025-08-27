import { useQuery } from "@tanstack/react-query";

import { fetchCityTimezonesFromCDN } from "@calcom/lib/timezone-cdn";
import type { CityTimezone } from "@calcom/lib/timezone-cdn";

type Timezones = { city: string; timezone: string }[];
const useGetCityTimezones = () => {
  const { isLoading, data: rawData } = useQuery<CityTimezone[]>({
    queryKey: ["city-timezones-cdn"],
    queryFn: fetchCityTimezonesFromCDN,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  const data: Timezones = rawData?.map(({ city, timezone }) => ({ city, timezone })) || [];

  return { isLoading, data };
};

export default useGetCityTimezones;
