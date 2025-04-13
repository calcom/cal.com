import { useQuery } from "@tanstack/react-query";

import {
  V2_ENDPOINTS,
  SUCCESS_STATUS,
  VERSION_2024_06_11,
  CAL_API_VERSION_HEADER,
} from "@calcom/platform-constants";
import type { GetSchedulesOutput_2024_06_11 } from "@calcom/platform-types";

import http from "../../lib/http";
import { useAtomsContext } from "../useAtomsContext";

export const QUERY_KEY = "user-schedules";

export const useSchedules = () => {
  const { isInit } = useAtomsContext();

  const pathname = `/${V2_ENDPOINTS.availability}`;

  const { isLoading, error, data } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => {
      return http
        .get<GetSchedulesOutput_2024_06_11>(pathname, {
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
