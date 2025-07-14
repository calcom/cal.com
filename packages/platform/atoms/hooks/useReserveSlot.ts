import { useMutation } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type {
  ApiResponse,
  ApiErrorResponse,
  ApiSuccessResponse,
  ReserveSlotInput_2024_04_15,
} from "@calcom/platform-types";

import http from "../lib/http";

interface IUseReserveSlot {
  onSuccess?: (res: ApiSuccessResponse<string>) => void;
  onError?: (err: ApiErrorResponse) => void;
}
export const useReserveSlot = (
  { onSuccess, onError }: IUseReserveSlot = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const reserveSlot = useMutation<ApiResponse<string>, unknown, ReserveSlotInput_2024_04_15>({
    mutationFn: (props: ReserveSlotInput_2024_04_15) => {
      return http.post<ApiResponse<string>>("/slots/reserve", props).then((res) => {
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
  return reserveSlot;
};
