import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type {
  ApiErrorResponse,
  ApiResponse,
  ApiSuccessResponseWithoutData,
  RemoveSelectedSlotInput,
} from "@calcom/platform-types";
import { useMutation } from "@tanstack/react-query";
import http from "../lib/http";

interface IUseDeleteSelectedSlot {
  onSuccess?: (res: ApiSuccessResponseWithoutData) => void;
  onError?: (err: ApiErrorResponse) => void;
}
export const useDeleteSelectedSlot = (
  { onSuccess, onError }: IUseDeleteSelectedSlot = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const deletedSlot = useMutation<ApiResponse, unknown, RemoveSelectedSlotInput>({
    mutationFn: (props: RemoveSelectedSlotInput) => {
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
    onSuccess: (data) => {
      if (data.status === SUCCESS_STATUS) {
        onSuccess?.(data);
      } else {
        onError?.(data);
      }
    },
    onError: (err) => {
      onError?.(err as ApiErrorResponse);
    },
  });
  return deletedSlot;
};
