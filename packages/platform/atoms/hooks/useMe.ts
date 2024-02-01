import { useQuery } from "@tanstack/react-query";

import { BASE_URL, API_VERSION, V2_ENDPOINTS } from "@calcom/platform-constants";

export const useMe = (key: string) => {
  const endpoint = new URL(BASE_URL);

  endpoint.pathname = `${API_VERSION}/${V2_ENDPOINTS.me}`;
  endpoint.searchParams.set("apiKey", key);

  const { data } = useQuery({
    queryKey: ["get-user-timezone"],
    queryFn: () => {
      return fetch(endpoint.toString(), {
        method: "get",
        headers: { "Content-type": "application/json" },
      }).then((res) => res.json());
    },
  });

  return data;
};
