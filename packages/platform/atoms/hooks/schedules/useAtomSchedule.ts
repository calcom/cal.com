import { useQuery } from "@tanstack/react-query";

import type { FindDetailedScheduleByIdReturnType } from "@calcom/lib/server/repository/schedule";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse } from "@calcom/platform-types";

import http from "../../lib/http";

export const QUERY_KEY = "use-atom-schedule";

export const useAtomSchedule = (scheduleId?: string, isManagedEventType?: boolean) => {
  const pathname = "atoms/schedules";

  const { isLoading, error, data } = useQuery({
    queryKey: [QUERY_KEY, scheduleId, isManagedEventType],
    queryFn: () => {
      return http
        .get<ApiResponse<FindDetailedScheduleByIdReturnType | null>>(pathname, {
          params: { scheduleId, isManagedEventType },
        })
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return res.data.data;
          }
          throw new Error(res.data.error?.message);
        });
    },
  });

  return { isLoading, error, data };
};
