import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";

import http from "../lib/http";

export const QUERY_KEY = "get-country-code";

interface CountryCodeData {
  countryCode: string;
}

type CountryCodeResponse = ApiResponse<CountryCodeData>;

/**
 * Custom hook to fetch the user's country code based on their IP location.
 * This is used for auto-detecting the default country in phone input fields.
 * @returns The result of the query containing the country code.
 */
export const useCountryCode = () => {
  const pathname = "/atoms/country-code";
  const countryCode = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => {
      return http?.get<CountryCodeResponse>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return (res.data as ApiSuccessResponse<CountryCodeData>).data.countryCode;
        }
        return "";
      });
    },
    staleTime: Infinity, // Country code doesn't change during a session
    retry: false,
  });

  return countryCode;
};
