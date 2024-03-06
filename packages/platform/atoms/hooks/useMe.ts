import { useQuery } from "@tanstack/react-query";

import { BASE_URL, API_VERSION, V2_ENDPOINTS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, UserResponse } from "@calcom/platform-types";

import http from "../lib/http";

export const QUERY_KEY = "get-me";
export const useMe = () => {
  const endpoint = new URL(BASE_URL);

  endpoint.pathname = `api/${API_VERSION}/${V2_ENDPOINTS.me}`;

  const me = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => {
      return http?.get<ApiResponse<UserResponse>>(endpoint.toString()).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return res.data;
        }
        throw new Error(res.data.error.message);
      });
    },
  });

  return me;
};
