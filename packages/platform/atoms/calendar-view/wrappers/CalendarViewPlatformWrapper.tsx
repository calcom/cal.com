import { AtomsWrapper } from "@/components/atoms-wrapper";
import { useMemo, useEffect } from "react";
import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";
import {
  BookerStoreProvider,
  useBookerStoreContext,
  useInitializeBookerStoreContext,
} from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { Header } from "@calcom/features/bookings/Booker/components/Header";
import { BookerSection } from "@calcom/features/bookings/Booker/components/Section";
import { useBookerLayout } from "@calcom/features/bookings/Booker/components/hooks/useBookerLayout";
import { usePrefetch } from "@calcom/features/bookings/Booker/components/hooks/usePrefetch";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { LargeCalendar } from "@calcom/features/calendar-view/LargeCalendar";
import { getUsernameList } from "@calcom/features/eventtypes/lib/defaultEvents";
import { useTimesForSchedule } from "@calcom/features/schedules/lib/use-schedule/useTimesForSchedule";

import { formatUsername } from "../../booker/BookerPlatformWrapper";
import type {
  BookerPlatformWrapperAtomPropsForIndividual,
  BookerPlatformWrapperAtomPropsForTeam,
  BookerEntityConfig,
} from "../../booker/types";
import { useAtomGetPublicEvent } from "../../hooks/event-types/public/useAtomGetPublicEvent";
import { useEventType } from "../../hooks/event-types/public/useEventType";
import { useTeamEventType } from "../../hooks/event-types/public/useTeamEventType";
import { useAvailableSlots } from "../../hooks/useAvailableSlots";

/**
 * Resolves the orgSlug from multiple sources with the following priority:
 * 1. Explicitly provided entity.orgSlug
 * 2. Event data's entity.orgSlug (from API response)
 * 3. Falls back to undefined (lets the backend handle resolution)
 */
function resolveOrgSlug(
  entityFromProps: BookerEntityConfig | undefined,
  eventData: { entity?: { orgSlug?: string | null } } | null | undefined
): string | undefined {
  if (entityFromProps?.orgSlug) {
    return entityFromProps.orgSlug;
  }
  if (eventData?.entity?.orgSlug) {
    return eventData.entity.orgSlug;
  }
  return undefined;
}

type CalendarViewPlatformWrapperAtomPropsForIndividual = {
  username: string | string[];
  eventSlug: string;
  entity?: BookerEntityConfig;
};

type CalendarViewPlatformWrapperAtomPropsForTeam = {
  teamId: number;
  eventSlug: string;
  entity?: BookerEntityConfig;
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

  // Resolve orgSlug transparently from props or event data
  const resolvedOrgSlug = useMemo(() => {
    return resolveOrgSlug(props.entity, event.data);
  }, [props.entity, event.data]);

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

  const bookingData = useBookerStoreContext((state) => state.bookingData);

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

  return (
    <AtomsWrapper>
      <BookerSection area="header" className="bg-default dark:bg-cal-muted sticky top-0 z-10">
        <Header
          isCalendarView={true}
          isMyLink={true}
          eventSlug={props.eventSlug}
          enabledLayouts={bookerLayout.bookerLayouts.enabledLayouts}
          extraDays={7}
          isMobile={false}
          nextSlots={6}
        />
      </BookerSection>
      <BookerSection
        key="large-calendar"
        area="main"
        visible={true}
        className="border-subtle sticky top-0 -ml-px h-full md:border-l">
        <LargeCalendar extraDays={7} schedule={schedule.data} isLoading={schedule.isPending} event={event} />
      </BookerSection>
    </AtomsWrapper>
  );
};

export const CalendarViewPlatformWrapper = (
  props:
    | (BookerPlatformWrapperAtomPropsForIndividual & { teamId?: number })
    | Omit<BookerPlatformWrapperAtomPropsForTeam, "isTeamEvent">
) => {
  return (
    <BookerStoreProvider>
      <CalendarViewPlatformWrapperComponent {...props} />
    </BookerStoreProvider>
  );
};
