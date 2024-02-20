import { useMutation } from "@tanstack/react-query";

import type { ReserveSlotInput, ApiResponse } from "@calcom/platform-types";

import http from "../lib/http";

export const QUERY_KEY = "reserve-slot";

export const useReserveSlot = (props: ReserveSlotInput) => {
  const reserveSlot = useMutation({
    mutationFn: () => {
      return http
        .post<ApiResponse<string>>("/slots/reserve", {
          body: props,
        })
        .then((res) => res.data);
    },
  });
  return reserveSlot;
};
