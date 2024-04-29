import { useQuery } from "@tanstack/react-query";

import { V2_ENDPOINTS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { getBookingForReschedule } from "@calcom/platform-libraries";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";

import http from "../lib/http";

export const QUERY_KEY = "user-booking";

interface IUseGetBookingForReschedule {
  onSuccess?: (res: ApiSuccessResponse<Awaited<ReturnType<typeof getBookingForReschedule>>>["data"]) => void;
  onError?: (err: Error) => void;
  uid?: string;
}
export const useGetBookingForReschedule = (
  props: IUseGetBookingForReschedule = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
    uid: "",
  }
) => {
  const pathname = `/${V2_ENDPOINTS.bookings}/${props.uid}/reschedule`;

  const bookingQuery = useQuery({
    queryKey: [QUERY_KEY, props.uid],
    queryFn: () => {
      return http
        .get<ApiResponse<Awaited<ReturnType<typeof getBookingForReschedule>>>>(pathname)
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            props.onSuccess?.(
              (res.data as ApiSuccessResponse<Awaited<ReturnType<typeof getBookingForReschedule>>>).data
            );
            return (res.data as ApiSuccessResponse<Awaited<ReturnType<typeof getBookingForReschedule>>>).data;
          }
          const error = new Error(res.data.error.message);
          props.onError?.(error);
          throw error;
        })
        .catch((err) => {
          props.onError?.(err);
        });
    },
    enabled: !!props?.uid,
  });

  return bookingQuery;
};
