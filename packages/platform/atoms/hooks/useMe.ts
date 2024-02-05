import { useQuery } from "@tanstack/react-query";

import { BASE_URL, API_VERSION, V2_ENDPOINTS } from "@calcom/platform-constants";

import http from "../lib/http";

export const useMe = () => {
  const endpoint = new URL(BASE_URL);

  endpoint.pathname = `api/${API_VERSION}/${V2_ENDPOINTS.me}`;

  const { data: me } = useQuery({
    queryKey: ["get-user-timezone"],
    queryFn: () => {
      return http?.get(endpoint.toString()).then((res) => res.data);
    },
  });

  return me;
};
