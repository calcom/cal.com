import { useQuery } from "@tanstack/react-query";

import type { PublicEventType } from "@calcom/platform-libraries";
import type { ApiResponse, GetPublicEventInput } from "@calcom/platform-types";

import http from "../lib/http";

export const QUERY_KEY = "get-public-event";
export const usePublicEvent = (props: GetPublicEventInput) => {
  const event = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => {
      return http
        .get<ApiResponse<PublicEventType>>("/events", {
          params: props,
        })
        .then((res) => res.data);
    },
  });

  return event;
};
