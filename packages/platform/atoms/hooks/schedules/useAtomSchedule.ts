import type { FindDetailedScheduleByIdReturnType } from "@calcom/features/schedules/repositories/ScheduleRepository";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse } from "@calcom/platform-types";
import { useQuery } from "@tanstack/react-query";
import http from "../../lib/http";
import { useAtomsContext } from "../useAtomsContext";

export const QUERY_KEY = "use-atom-schedule";

export const useAtomSchedule = (scheduleId?: string, isManagedEventType?: boolean) => {
  const pathname = "atoms/schedules";
  const { isInit, accessToken } = useAtomsContext();

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
    enabled: isInit && !!accessToken,
  });

  return { isLoading, error, data };
};
