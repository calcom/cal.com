import { useQuery } from "@tanstack/react-query";

import { V2_ENDPOINTS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse } from "@calcom/platform-types";

import { useAtomsContext } from "../../hooks/useAtomsContext";
import http from "../../lib/http";
import type { AtomEventTypeListItem, AtomEventTypesResponse } from "../types";

export const QUERY_KEY = "use-atom-all-event-types";

export const useAtomGetAllEventTypes = () => {
  const pathname = `/atoms/${V2_ENDPOINTS.eventTypes}`;
  const { isInit, accessToken } = useAtomsContext();

  const { isLoading, error, data, refetch } = useQuery<AtomEventTypeListItem[]>({
    queryKey: [QUERY_KEY],
    queryFn: () => {
      return http.get<ApiResponse<AtomEventTypesResponse>>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return res.data.data.eventTypes;
        }
        throw new Error(res.data.error?.message);
      });
    },
    enabled: isInit && !!accessToken,
  });

  return { isLoading, error, data, refetch };
};
