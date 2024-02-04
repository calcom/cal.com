import { useQuery } from "@tanstack/react-query";

import { BASE_URL, API_VERSION, V2_ENDPOINTS } from "@calcom/platform-constants";

import http from "../lib/http";
import { useAtomsContext } from "./useAtomsContext";

export const useMe = () => {
  const { accessToken } = useAtomsContext();
  const endpoint = new URL(BASE_URL);

  endpoint.pathname = `api/${API_VERSION}/${V2_ENDPOINTS.me}`;

  const { data: me } = useQuery({
    queryKey: ["get-user-timezone"],
    queryFn: () => {
      return http
        ?.get(endpoint.toString(), {
          headers: { "Content-type": "application/json", Authorization: `Bearer ${accessToken}` },
        })
        .then((res) => res.data);
    },
  });

  return me;
};
