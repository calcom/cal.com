import { useMutation } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { RemoveSelectedSlotInput, ApiResponse } from "@calcom/platform-types";

import http from "../lib/http";

export const useDeleteSelectedSlot = (props: RemoveSelectedSlotInput) => {
  const deletedSlot = useMutation({
    mutationFn: () => {
      return http
        .delete<ApiResponse>("/slots/selected-slot", {
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
  return deletedSlot;
};
