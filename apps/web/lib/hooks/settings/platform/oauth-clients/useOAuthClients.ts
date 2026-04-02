import type { ApiSuccessResponse, PlatformOAuthClientDto } from "@calcom/platform-types";
import { useQuery } from "@tanstack/react-query";

export const useOAuthClients = () => {
  const query = useQuery<ApiSuccessResponse<PlatformOAuthClientDto[]>>({
    queryKey: ["oauth-clients"],
    queryFn: () => {
      return fetch("/api/v2/oauth-clients", {
        method: "get",
        headers: { "Content-type": "application/json" },
      }).then((res) => res.json());
    },
  });

  return { ...query, data: query.data?.data ?? [] };
};
