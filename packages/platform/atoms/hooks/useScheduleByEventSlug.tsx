import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";

import http from "../lib/http";
import { useAtomsContext } from "./useAtomsContext";

type ScheduleByEventSlugData = {
  id: number;
  name: string;
  availability: unknown[][];
  dateOverrides: unknown[];
  timeZone: string;
  workingHours: unknown[];
  isDefault: boolean;
};

export const QUERY_KEY = "get-schedule-by-event-slug";
export const useScheduleByEventSlug = (props: { eventSlug?: string; enabled?: boolean }) => {
  const { isInit } = useAtomsContext();

  const schedule = useQuery({
    queryKey: [QUERY_KEY, props.eventSlug],
    queryFn: () => {
      return http
        .get<ApiResponse<ScheduleByEventSlugData>>(`/atoms/schedules/event-type/${props.eventSlug}`)
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return (res.data as ApiSuccessResponse<ScheduleByEventSlugData>)?.data;
          }
          throw new Error(res.data.error.message);
        });
    },
    enabled: !!props.eventSlug && (props?.enabled !== undefined ? props.enabled && isInit : isInit),
    staleTime: 5000,
  });

  return schedule;
};
