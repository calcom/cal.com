import { AtomsWrapper } from "@/components/atoms-wrapper";
import { useMemo, useEffect } from "react";
import { shallow } from "zustand/shallow";
import { BookerStoreProvider } from "@calcom/features/bookings/Booker/BookerStoreProvider";

import { CalendarViewComponent } from "../CalendarViewComponent";
import { EventTypeCalendarViewComponent } from "../EventTypeCalendarViewComponent";

import { formatUsername } from "../../booker/BookerPlatformWrapper";
import type {
  BookerPlatformWrapperAtomPropsForIndividual,
  BookerPlatformWrapperAtomPropsForTeam,
} from "../../booker/types";
import { useAtomGetPublicEvent } from "../../hooks/event-types/public/useAtomGetPublicEvent";
import { useEventType } from "../../hooks/event-types/public/useEventType";
import { useTeamEventType } from "../../hooks/event-types/public/useTeamEventType";
import { useAvailableSlots } from "../../hooks/useAvailableSlots";

/**
 * Resolves the orgSlug from event data.
 * Falls back to undefined to let the backend handle resolution.
 */
function resolveOrgSlug(
  eventData: { entity?: { orgSlug?: string | null } } | null | undefined
): string | undefined {
  if (eventData?.entity?.orgSlug) {
    return eventData.entity.orgSlug;
  }
  return undefined;
}

type CalendarViewPlatformWrapperAtomPropsForIndividual = {
  username: string | string[];
  eventSlug: string;
};

export type CalendarViewPlatformWrapperAtomPropsForTeam = {
  teamId: number;
  eventSlug: string;
};

const CalendarViewPlatformWrapperComponent = (
  props:
    | (CalendarViewPlatformWrapperAtomPropsForIndividual & { teamId?: number })
    | (CalendarViewPlatformWrapperAtomPropsForTeam & { username?: string | string[] })
) => {
  const isTeamEvent = !!props.teamId;
  const teamId: number | undefined = props.teamId ? props.teamId : undefined;
  const username = useMemo(() => {
    if (props.username) {
      return formatUsername(props.username);
    }
    return "";
  }, [props.username]);

  const { isPending } = useEventType(username, props.eventSlug, isTeamEvent);

  const { isPending: isTeamPending } = useTeamEventType(teamId, props.eventSlug, isTeamEvent);

  const selectedDuration = useBookerStoreContext((state) => state.selectedDuration);
  const setOrg = useBookerStoreContext((state) => state.setOrg);

  const event = useAtomGetPublicEvent({
    username,
    eventSlug: props.eventSlug,
    isTeamEvent: isTeamEvent,
    teamId,
    selectedDuration,
  });

  // Resolve orgSlug from event data
  const resolvedOrgSlug = useMemo(() => {
    return resolveOrgSlug(event.data);
  }, [event.data]);

  // Update org in store when resolved orgSlug changes
  useEffect(() => {
    setOrg(resolvedOrgSlug ?? null);
  }, [resolvedOrgSlug]);

  const bookerLayout = useBookerLayout(event.data?.profile?.bookerLayouts);

  const [bookerState, _setBookerState] = useBookerStoreContext(
    (state) => [state.state, state.setState],
    shallow
  );
  const selectedDate = useBookerStoreContext((state) => state.selectedDate);
  const date = dayjs(selectedDate).format("YYYY-MM-DD");
  const month = useBookerStoreContext((state) => state.month);
  const [dayCount] = useBookerStoreContext((state) => [state.dayCount, state.setDayCount], shallow);

  const { prefetchNextMonth, monthCount } = usePrefetch({
    date,
    month,
    bookerLayout,
    bookerState,
  });

  const [startTime, endTime] = useTimesForSchedule({
    month,
    monthCount,
    dayCount,
    prefetchNextMonth,
    selectedDate,
  });

  const { timezone } = useTimePreferences();
  const isDynamic = useMemo(() => {
    return getUsernameList(username ?? "").length > 1;
  }, [username]);

type CalendarViewComponentProps = {
  isEventTypeView?: false;
};

  useInitializeBookerStoreContext({
    ...props,
    eventId: event?.data?.id,
    layout: "week_view",
    username,
    bookingData,
    isPlatform: true,
    allowUpdatingUrlParams: false,
    org: resolvedOrgSlug,
  });

  const schedule = useAvailableSlots({
    usernameList: getUsernameList(username),
    eventTypeId: event?.data?.id ?? 0,
    startTime,
    endTime,
    timeZone: timezone,
    duration: selectedDuration ?? undefined,
    teamMemberEmail: undefined,
    ...(isTeamEvent
      ? {
          isTeamEvent: isTeamEvent,
          teamId: teamId,
        }
      : {}),
    enabled:
      Boolean(teamId || username) &&
      Boolean(month) &&
      Boolean(timezone) &&
      (isTeamEvent ? !isTeamPending : !isPending) &&
      Boolean(event?.data?.id),
    // Use resolved orgSlug for availability
    orgSlug: resolvedOrgSlug,
    eventTypeSlug: isDynamic ? "dynamic" : props.eventSlug || "",
  });

  return <EventTypeCalendarViewComponent {...props} />;
};

export const CalendarViewPlatformWrapper = (props: CalendarViewProps) => {
  return (
    <BookerStoreProvider>
      <CalendarViewPlatformWrapperComponent {...props} />
    </BookerStoreProvider>
  );
};
