import { useQuery } from "@tanstack/react-query";
import { shallow } from "zustand/shallow";

import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import { SUCCESS_STATUS, V2_ENDPOINTS } from "@calcom/platform-constants";
import type { PublicEventType } from "@calcom/platform-libraries";
import type { ApiResponse } from "@calcom/platform-types";

import http from "../../lib/http";

export const QUERY_KEY = "use-event-type";
export type UsePublicEventReturnType = ReturnType<typeof useEventType>;

export const useEventType = (username: string, eventSlug: string) => {
  const [stateUsername, stateEventSlug] = useBookerStore(
    (state) => [state.username, state.eventSlug],
    shallow
  );

  const requestUsername = stateUsername ?? username;
  const requestEventSlug = stateEventSlug ?? eventSlug;

  const event = useQuery({
    queryKey: [QUERY_KEY, stateUsername ?? username, stateEventSlug ?? eventSlug],
    queryFn: () => {
      return http
        .get<ApiResponse<PublicEventType>>(
          `/${V2_ENDPOINTS.users}/${requestUsername}/event-types/${requestEventSlug}`
        )
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return res.data.data;
          }
          throw new Error(res.data.error.message);
        });
    },
  });

  return event;
};
