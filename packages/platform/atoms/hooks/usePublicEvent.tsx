import { useQuery } from "@tanstack/react-query";

import type { getPublicEvent } from "@calcom/platform-libraries";
import type { ApiResponse, GetPublicEventInput } from "@calcom/platform-types";

import http from "../lib/http";

export const usePublicEvent = (props: GetPublicEventInput) => {
  const event = useQuery({
    queryKey: ["get-public-event"],
    queryFn: () => {
      return http
        .get<ApiResponse<Awaited<ReturnType<typeof getPublicEvent>>>>("/events", {
          params: props,
        })
        .then((res) => res.data);
    },
  });

  return event;
};
