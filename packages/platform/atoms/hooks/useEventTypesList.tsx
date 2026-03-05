import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";

import http from "../lib/http";
import { useAtomsContext } from "./useAtomsContext";

type EventTypeWithTeam = {
  id: number;
  team: { id: number; name: string } | null;
  title: string;
  slug: string;
  length: number;
  username: string | null;
};

type ListWithTeamData = EventTypeWithTeam[];

export const QUERY_KEY = "get-event-types-list-with-team";
export const useEventTypesList = (props: { enabled?: boolean }) => {
  const { isInit } = useAtomsContext();

  const eventTypes = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => {
      return http.get<ApiResponse<ListWithTeamData>>("/atoms/event-types/list-with-team").then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return (res.data as ApiSuccessResponse<ListWithTeamData>)?.data;
        }
        throw new Error(res.data.error.message);
      });
    },
    enabled: props?.enabled !== undefined ? props.enabled && isInit : isInit,
    staleTime: 5000,
  });

  return eventTypes;
};
