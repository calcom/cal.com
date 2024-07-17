import { useQuery } from "@tanstack/react-query";

import http from "../lib/http";

const useGetCityTimezones = () => {
  const pathname = `/timezones`;

  const { isLoading, data } = useQuery({
    queryKey: ["city-timezones"],
    queryFn: () => {
      return http?.get(pathname).then((res) => res.data);
    },
  });

  return { isLoading, data };
};

export default useGetCityTimezones;
