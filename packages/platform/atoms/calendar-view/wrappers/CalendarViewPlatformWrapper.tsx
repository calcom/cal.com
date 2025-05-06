import { useMemo } from "react";

import type { BookerProps } from "@calcom/features/bookings/Booker";
import { useBookerLayout } from "@calcom/features/bookings/Booker/components/hooks/useBookerLayout";

// import {
//   transformApiEventTypeForAtom,
//   transformApiTeamEventTypeForAtom,
// } from "../event-types/atom-api-transformers/transformApiEventTypeForAtom";
import {
  transformApiEventTypeForAtom,
  transformApiTeamEventTypeForAtom,
} from "../../event-types/atom-api-transformers/transformApiEventTypeForAtom";
import { useEventType } from "../../hooks/event-types/public/useEventType";
import { useTeamEventType } from "../../hooks/event-types/public/useTeamEventType";

type CalendarViewPlatformWrapperProps = {
  username: string;
  eventSlug: string;
  isTeamEvent?: false;
  teamId?: number;
  hostsLimit?: number;
  defaultFormValues?: {
    firstName?: string;
    lastName?: string;
    guests?: string[];
    name?: string;
    email?: string;
    notes?: string;
    rescheduleReason?: string;
  } & Record<string, string | string[]>;
  entity?: BookerProps["entity"];
};

export const CalendarViewPlatformWrapper = (props: CalendarViewPlatformWrapperProps) => {
  const { username, eventSlug, isTeamEvent, teamId, hostsLimit, defaultFormValues } = props;

  const { isSuccess, isError, isPending, data } = useEventType(username, eventSlug, isTeamEvent);
  const {
    isSuccess: isTeamSuccess,
    isError: isTeamError,
    isPending: isTeamPending,
    data: teamEventTypeData,
  } = useTeamEventType(teamId, eventSlug, isTeamEvent, hostsLimit);

  const event = useMemo(() => {
    if (props.isTeamEvent && !isTeamPending && teamId && teamEventTypeData && teamEventTypeData.length > 0) {
      return {
        isSuccess: isTeamSuccess,
        isError: isTeamError,
        isPending: isTeamPending,
        data:
          teamEventTypeData && teamEventTypeData.length > 0
            ? transformApiTeamEventTypeForAtom(
                teamEventTypeData[0],
                props.entity,
                props.defaultFormValues,
                !!props.hostsLimit
              )
            : undefined,
      };
    }

    return {
      isSuccess,
      isError,
      isPending,
      data:
        data && data.length > 0
          ? transformApiEventTypeForAtom(data[0], props.entity, props.defaultFormValues, !!props.hostsLimit)
          : undefined,
    };
  }, [
    props.isTeamEvent,
    teamId,
    props.entity,
    teamEventTypeData,
    isSuccess,
    isError,
    isPending,
    data,
    isTeamPending,
    isTeamSuccess,
    isTeamError,
    props.hostsLimit,
  ]);

  const bookerLayout = useBookerLayout(event.data);

  console.log("----");
  console.log(data, "individual event data");
  console.log(bookerLayout, "booker layout".toLocaleUpperCase());
  console.log("----");

  console.log("----");
  console.log(teamEventTypeData, "team event data".toLocaleUpperCase());
  console.log("----");

  return <div>This is the calendar view atom!</div>;
};
