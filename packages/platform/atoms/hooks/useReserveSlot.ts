import { useMutation } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ReserveSlotInput, ApiResponse } from "@calcom/platform-types";

import http from "../lib/http";

export const useReserveSlot = (props: ReserveSlotInput) => {
  const reserveSlot = useMutation({
    mutationFn: () => {
      return http
        .post<ApiResponse<string>>("/slots/reserve", {
          body: props,
        })
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return res.data;
          }
          throw new Error(res.data.error.message);
        });
    },
  });
  return reserveSlot;
};
