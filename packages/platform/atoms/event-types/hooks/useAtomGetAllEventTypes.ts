import { useQuery } from "@tanstack/react-query";
import { V2_ENDPOINTS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";

import { useAtomsContext } from "../../hooks/useAtomsContext";
import http from "../../lib/http";
import type { AtomEventTypeListItem, AtomEventTypesResponse } from "../types/atom-event-type-list.type";

export const QUERY_KEY = "use-atom-all-event-types";

export const useAtomGetAllEventTypes = () => {
  const pathname = `/atoms/${V2_ENDPOINTS.eventTypes}`;
  const { isInit, accessToken } = useAtomsContext();

  return useQuery<AtomEventTypeListItem[]>({
    queryKey: [QUERY_KEY],
    queryFn: () => {
      return http?.get<ApiResponse<AtomEventTypesResponse>>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          const data = (res.data as ApiSuccessResponse<AtomEventTypesResponse>).data;
          return data.eventTypes;
        }
        throw new Error(res.data.error.message);
      });
    },
    enabled: isInit && !!accessToken,
  });
};