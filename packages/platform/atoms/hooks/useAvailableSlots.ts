import { useQuery } from "@tanstack/react-query";

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
        .then((res) => res.data);
    },
  });
  return availableSlots;
};
