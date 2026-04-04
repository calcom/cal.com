import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { getUsernameList } from "@calcom/features/eventtypes/lib/defaultEvents";
import { getAbsoluteAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { SUCCESS_STATUS, V2_ENDPOINTS } from "@calcom/platform-constants";
import type { PublicEventType } from "@calcom/features/eventtypes/lib/getPublicEvent";
import type { ApiResponse } from "@calcom/platform-types";

import http from "../../../lib/http";
import { useAtomsContext } from "../../../hooks/useAtomsContext";
import { useIsPlatformBookerEmbed } from "../../../hooks/useIsPlatformBookerEmbed";

export const QUERY_KEY = "get-public-event";
export type UsePublicEventReturnType = ReturnType<typeof useAtomGetPublicEvent>;

type Props = {
  username: string;
  eventSlug: string;
  isTeamEvent?: boolean;
  teamId?: number;
  selectedDuration: number | null;
};

export const useAtomGetPublicEvent = ({
  username,
  eventSlug,
  isTeamEvent,
  teamId,
  selectedDuration,
}: Props) => {
  const { organizationId } = useAtomsContext();
  const isPlatformBookerEmbed = useIsPlatformBookerEmbed();

  const isDynamic = useMemo(() => {
    return getUsernameList(username ?? "").length > 1;
  }, [username]);

  const pathname = `/atoms/${V2_ENDPOINTS.eventTypes}/${eventSlug}/public`;

  const event = useQuery({
    queryKey: [
      QUERY_KEY,
      username,
      eventSlug,
      isTeamEvent,
      teamId,
      organizationId,
    ],
    queryFn: () => {
      const params: Record<string, any> = {
        isTeamEvent,
        teamId,
        username: getUsernameList(username ?? "").join("+"),
      };

      // Only include orgId if it's not 0
      if (organizationId !== 0) {
        params.orgId = organizationId;
      }

      return http
        ?.get<ApiResponse<PublicEventType>>(pathname, {
          params,
        })
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            if (isDynamic && selectedDuration && res.data.data) {
              // note(Lauris): Mandatory - In case of "dynamic" event type default event duration returned by the API is 30,
              // but we are re-using the dynamic event type as a team event, so we must set the event length to whatever the event length is.
              res.data.data.length = selectedDuration;
            }
            if (isPlatformBookerEmbed && res.data.data) {
              if (res.data.data.profile?.image) {
                res.data.data.profile.image = getAbsoluteAvatarUrl(
                  res.data.data.profile.image
                );
              }
              if (res.data.data.entity?.logoUrl) {
                res.data.data.entity.logoUrl = getAbsoluteAvatarUrl(
                  res.data.data.entity.logoUrl
                );
              }
            }
            return res.data.data;
          }
          throw new Error(res.data.error.message);
        });
    },
  });

  return event;
};
