import { useQuery } from "@tanstack/react-query";

import { BASE_URL, API_VERSION, V2_ENDPOINTS } from "@calcom/platform-constants";

import { useAtomsContext } from "./useAtomsContext";

export const useMe = () => {
  const endpoint = new URL(BASE_URL);

  endpoint.pathname = `${API_VERSION}/${V2_ENDPOINTS.me}`;

  const { accessToken } = useAtomsContext();

  const { data: me } = useQuery({
    queryKey: ["get-user-timezone"],
    queryFn: () => {
      return fetch(endpoint.toString(), {
        method: "get",
        headers: { "Content-type": "application/json", Authorization: `Bearer ${accessToken}` },
      }).then((res) => res.json());
    },
  });

  return me;
};
