import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse } from "@calcom/platform-types";

import { useAtomsContext } from "../../hooks/useAtomsContext";
import http from "../../lib/http";

export const QUERY_KEY = "use-event-app-integration";
export const useAtomsEventTypePaymentInfo = (uid: string) => {
  const pathname = `/atoms/payment/${uid}`;
  const { isInit, accessToken } = useAtomsContext();

  return useQuery({
    queryKey: [QUERY_KEY, uid],
    queryFn: () => {
      return http?.get<ApiResponse<unknown>>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return res.data.data;
        }
        throw new Error(res.data.error.message);
      });
    },
    enabled: !!uid && isInit && !!accessToken,
  });
};
