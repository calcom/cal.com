import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { AvailableSlotsType } from "@calcom/platform-libraries";
import type { GetAvailableSlotsInput, ApiResponse } from "@calcom/platform-types";

import http from "../lib/http";

export const QUERY_KEY = "get-available-slots";

export const useAvailableSlots = (props: GetAvailableSlotsInput) => {
  const availableSlots = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => {
      return http
        .get<ApiResponse<AvailableSlotsType>>("/slots/available", {
          params: props,
        })
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return res.data;
          }
          throw new Error(res.data.error.message);
        });
    },
  });
  return availableSlots;
};
