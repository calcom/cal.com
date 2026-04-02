import {
  CAL_API_VERSION_HEADER,
  SUCCESS_STATUS,
  V2_ENDPOINTS,
  VERSION_2024_06_11,
} from "@calcom/platform-constants";
import type { GetScheduleOutput_2024_06_11 } from "@calcom/platform-types";
import { useQuery } from "@tanstack/react-query";
import http from "../../lib/http";
import { useAtomsContext } from "../useAtomsContext";

export const QUERY_KEY = "user-schedule";

export const useSchedule = (id?: number | string) => {
  const { isInit } = useAtomsContext();

  const pathname = id ? `/${V2_ENDPOINTS.availability}/${id}` : `/${V2_ENDPOINTS.availability}/default`;

  const { isLoading, error, data } = useQuery({
    queryKey: [QUERY_KEY, `${id}`],
    queryFn: () => {
      return http
        .get<GetScheduleOutput_2024_06_11>(pathname, {
          headers: { [CAL_API_VERSION_HEADER]: VERSION_2024_06_11 },
        })
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return res.data.data;
          }
          throw new Error(res.data.error?.message);
        });
    },
    enabled: isInit,
  });

  return { isLoading, error, data };
};
