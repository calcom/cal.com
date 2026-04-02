import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import { SUCCESS_STATUS, V2_ENDPOINTS } from "@calcom/platform-constants";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";
import { useQuery } from "@tanstack/react-query";
import { useAtomsContext } from "../../hooks/useAtomsContext";
import http from "../../lib/http";

export const QUERY_KEY = "use-event-by-id";
export const useAtomsEventTypeById = (id: number | null) => {
  const pathname = `/atoms/${V2_ENDPOINTS.eventTypes}/${id}`;
  const { isInit, accessToken } = useAtomsContext();

  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => {
      return http?.get<ApiResponse<EventTypeSetupProps>>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return (res.data as ApiSuccessResponse<EventTypeSetupProps>).data;
        }
        throw new Error(res.data.error.message);
      });
    },
    enabled: !!id && isInit && !!accessToken,
  });
};
