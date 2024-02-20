import { useMutation } from "@tanstack/react-query";

import type { RemoveSelectedSlotInput, ApiResponse } from "@calcom/platform-types";

import http from "../lib/http";

export const useDeleteSelectedSlot = (props: RemoveSelectedSlotInput) => {
  const deletedSlot = useMutation({
    mutationFn: () => {
      return http
        .delete<ApiResponse>("/slots/selected-slot", {
          params: props,
        })
        .then((res) => res.data);
    },
  });
  return deletedSlot;
};
