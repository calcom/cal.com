import { useQuery } from "@tanstack/react-query";

import type { PublicEventType } from "@calcom/platform-libraries";
import type { ApiResponse, GetPublicEventInput } from "@calcom/platform-types";

import http from "../lib/http";

export const usePublicEvent = (props: GetPublicEventInput) => {
  const event = useQuery({
    queryKey: ["get-public-event"],
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
