import type { ConnectedDestinationCalendars } from "@calcom/features/calendars/lib/getConnectedDestinationCalendars";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";
import { useQuery } from "@tanstack/react-query";
import http from "../lib/http";
import { useAtomsContext } from "./useAtomsContext";

export const QUERY_KEY = "get-connected-calendars";
export const useConnectedCalendars = (props: { enabled?: boolean }) => {
  const { isInit } = useAtomsContext();

  const calendars = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => {
      return http.get<ApiResponse<ConnectedDestinationCalendars>>("/calendars").then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return (res.data as ApiSuccessResponse<ConnectedDestinationCalendars>)?.data;
        }
        throw new Error(res.data.error.message);
      });
    },
    enabled: props?.enabled !== undefined ? props.enabled && isInit : isInit,
    staleTime: 5000,
  });

  return calendars;
};
