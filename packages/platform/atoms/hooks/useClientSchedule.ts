import { useQuery } from "@tanstack/react-query";

import { BASE_URL, API_VERSION, V2_ENDPOINTS } from "@calcom/platform-constants";

import http from "../lib/http";

const useClientSchedule = (id?: string) => {
  const endpoint = new URL(BASE_URL);

  endpoint.pathname = id
    ? `api/${API_VERSION}/${V2_ENDPOINTS.availability}/${id}`
    : `api/${API_VERSION}/${V2_ENDPOINTS.availability}/default`;

  endpoint.searchParams.set("for", "atom");

  const { isLoading, error, data } = useQuery({
    queryKey: ["user-schedule"],
    queryFn: () => {
      return http?.get(endpoint.toString()).then((res) => res.data);
    },
  });

  return { isLoading, error, data };
};

export default useClientSchedule;
