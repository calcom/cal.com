import { useMutation } from "@tanstack/react-query";

import type { BookingResponse } from "@calcom/platform-libraries";
import type { ApiResponse } from "@calcom/platform-types";
import type { BookingCreateBody } from "@calcom/prisma/zod-utils";

import http from "../lib/http";

export const useCreateInstantBooking = (props: BookingCreateBody) => {
  const createInstantBooking = useMutation({
    mutationFn: () => {
      return http
        .post<ApiResponse<BookingResponse>>("/ee/bookings/instant", {
          body: props,
        })
        .then((res) => res.data);
    },
  });
  return createInstantBooking;
};
