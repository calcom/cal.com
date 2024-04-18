import { useQuery } from "@tanstack/react-query";
import { shallow } from "zustand/shallow";

import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import { SUCCESS_STATUS, V2_ENDPOINTS } from "@calcom/platform-constants";
import type { PublicEventType } from "@calcom/platform-libraries";
import type { ApiResponse } from "@calcom/platform-types";

import http from "../lib/http";

export const QUERY_KEY = "get-public-event";
export type UsePublicEventReturnType = ReturnType<typeof usePublicEvent>;

type Props = {
  username: string;
  eventSlug: string;
  isDynamic?: boolean;
};

export const usePublicEvent = (props: Props) => {
  const [username, eventSlug] = useBookerStore((state) => [state.username, state.eventSlug], shallow);
  const isTeamEvent = useBookerStore((state) => state.isTeamEvent);
  const org = useBookerStore((state) => state.org);
  const selectedDuration = useBookerStore((state) => state.selectedDuration);

  const requestUsername = username ?? props.username;
  const requestEventSlug = eventSlug ?? props.eventSlug;

  const event = useQuery({
    queryKey: [QUERY_KEY, username ?? props.username, eventSlug ?? props.eventSlug, props.isDynamic],
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
            if (props.isDynamic && selectedDuration && res.data.data) {
              // note(Lauris): Mandatory - In case of "dynamic" event type default event duration returned by the API is 30,
              // but we are re-using the dynamic event type as a team event, so we must set the event length to whatever the event length is.
              res.data.data.length = selectedDuration;
            }

            return res.data.data;
          }
          throw new Error(res.data.error.message);
        });
    },
  });

  return event;
};
