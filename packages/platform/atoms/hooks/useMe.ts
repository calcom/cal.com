import { useQuery } from "@tanstack/react-query";

import { V2_ENDPOINTS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, UserResponse } from "@calcom/platform-types";

import http from "../lib/http";

export const QUERY_KEY = "get-me";
export const useMe = () => {
  const pathname = `/${V2_ENDPOINTS.me}`;
  const me = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => {
      return http?.get<ApiResponse<UserResponse>>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return res.data;
        }
        throw new Error(res.data.error.message);
      });
    },
  });

  return me;
};
