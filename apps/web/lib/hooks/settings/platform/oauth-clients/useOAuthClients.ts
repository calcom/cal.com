import { useQuery } from "@tanstack/react-query";

import type { ApiSuccessResponse } from "@calcom/platform-types";
import type { PlatformOAuthClient } from "@calcom/prisma/client";

export type ManagedUser = {
  id: number;
  email: string;
  username: string | null;
  timeZone: string;
  weekStart: string;
  createdDate: Date;
  timeFormat: number | null;
  defaultScheduleId: number | null;
};

export const useOAuthClients = () => {
  const query = useQuery<ApiSuccessResponse<PlatformOAuthClient[]>>({
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
