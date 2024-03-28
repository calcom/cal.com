import { useQuery } from "@tanstack/react-query";

import { BASE_URL, API_VERSION } from "@calcom/platform-constants";

import http from "../lib/http";

const useGetCityTimezones = () => {
  const endpoint = new URL(BASE_URL);

  endpoint.pathname = `api/${API_VERSION}/timezones`;

  const { isLoading, data } = useQuery({
    queryKey: ["city-timezones"],
    queryFn: () => {
      return http?.get(endpoint.toString()).then((res) => res.data);
    },
  });

  return { isLoading, data };
};

export default useGetCityTimezones;
