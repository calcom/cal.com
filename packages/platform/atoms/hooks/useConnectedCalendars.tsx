import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ConnectedDestinationCalendars } from "@calcom/platform-libraries";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";

import http from "../lib/http";

export const QUERY_KEY = "get-connected-calendars";
export const useConnectedCalendars = (props: { enabled?: boolean }) => {
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
    enabled: props?.enabled ?? true,
  });

  return calendars;
};
