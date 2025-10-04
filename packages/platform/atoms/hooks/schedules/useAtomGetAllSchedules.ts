import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

import http from "../../lib/http";
import { useAtomsContext } from "../useAtomsContext";

export const QUERY_KEY = "use-atom-user-schedules";

export const useAtomGetAllSchedules = () => {
  const pathname = "atoms/schedules/all";
  const { isInit, accessToken } = useAtomsContext();

  const { isLoading, error, data } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => {
      return http.get(pathname).then((res) => {
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
