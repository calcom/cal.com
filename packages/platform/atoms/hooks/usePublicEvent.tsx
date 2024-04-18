import { useQuery } from "@tanstack/react-query";
import { shallow } from "zustand/shallow";

import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import { SUCCESS_STATUS, V2_ENDPOINTS } from "@calcom/platform-constants";
import type { PublicEventType } from "@calcom/platform-libraries";
import type { ApiResponse } from "@calcom/platform-types";

import http from "../lib/http";

export const QUERY_KEY = "get-public-event";
export type UsePublicEventReturnType = ReturnType<typeof usePublicEvent>;

export const usePublicEvent = (props: { username: string; eventSlug: string }) => {
  const [username, eventSlug] = useBookerStore((state) => [state.username, state.eventSlug], shallow);
  const isTeamEvent = useBookerStore((state) => state.isTeamEvent);
  const org = useBookerStore((state) => state.org);

  const requestUsername = username ?? props.username;
  const requestEventSlug = eventSlug ?? props.eventSlug;

  const event = useQuery({
    queryKey: [QUERY_KEY, username ?? props.username, eventSlug ?? props.eventSlug],
    queryFn: () => {
      return http
        .get<ApiResponse<PublicEventType>>(
          `/${V2_ENDPOINTS.eventTypes}/${requestUsername}/${requestEventSlug}/public`,
          {
            params: {
              isTeamEvent,
              org: org ?? null,
            },
          }
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
