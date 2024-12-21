import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse } from "@calcom/platform-types";

import http from "../lib/http";

type Timezones = { city: string; timezone: string }[];
const useGetCityTimezones = () => {
  const pathname = `/timezones`;

  const { isLoading, data } = useQuery<ApiResponse<Timezones>>({
    queryKey: ["city-timezones"],
    queryFn: () => {
      return http?.get<ApiResponse<Timezones>>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return res.data;
        }
        throw new Error(res.data.error.message);
      });
    },
  });

  return { isLoading, data };
};

export default useGetCityTimezones;
