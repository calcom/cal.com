import { useQuery } from "@tanstack/react-query";

import type { RemoveSelectedSlotInput, ApiResponse } from "@calcom/platform-types";

import http from "../lib/http";

export const QUERY_KEY = "delete-selected-slot";

export const useDeleteSelectedSlot = (props: RemoveSelectedSlotInput) => {
  const deletedSlot = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => {
      return http
        .delete<ApiResponse>("/slots/selected-slot", {
          params: props,
        })
        .then((res) => res.data);
    },
  });
  return deletedSlot;
};
