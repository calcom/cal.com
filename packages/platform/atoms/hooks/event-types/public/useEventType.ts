import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { shallow } from "zustand/shallow";

import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import { SUCCESS_STATUS, V2_ENDPOINTS } from "@calcom/platform-constants";
import type { EventTypeOutput_2024_06_14 } from "@calcom/platform-types";
import type { ApiResponse } from "@calcom/platform-types";

import http from "../../../lib/http";

export const QUERY_KEY = "use-event-type";
export type UsePublicEventReturnType = ReturnType<typeof useEventType>;

export const useEventType = (username: string, eventSlug: string) => {
  const [stateUsername, stateEventSlug] = useBookerStore(
    (state) => [state.username, state.eventSlug],
    shallow
  );

  const requestUsername = stateUsername ?? username;
  const requestEventSlug = stateEventSlug ?? eventSlug;

  const isDynamic = useMemo(() => {
    return getUsernameList(requestUsername ?? "").length > 1;
  }, [requestUsername]);

  const event = useQuery({
    queryKey: [QUERY_KEY, stateUsername ?? username, stateEventSlug ?? eventSlug],
    queryFn: async () => {
      if (isDynamic) {
        return http
          .get<ApiResponse<EventTypeOutput_2024_06_14[]>>(
            `/${V2_ENDPOINTS.eventTypes}?usernames=${encodeURIComponent(getUsernameList(username).join(","))}`
          )
          .then((res) => {
            if (res.data.status === SUCCESS_STATUS) {
              return res.data.data;
            }
            throw new Error(res.data.error.message);
          });
      }

      return http
        .get<ApiResponse<EventTypeOutput_2024_06_14[]>>(
          `/${V2_ENDPOINTS.eventTypes}?username=${requestUsername}&eventSlug=${requestEventSlug}`
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
