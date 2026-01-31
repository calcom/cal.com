import { useMemo } from "react";
import { shallow } from "zustand/shallow";

import {
  useBookerStoreContext,
  useInitializeBookerStoreContext,
} from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { Header } from "@calcom/features/bookings/components/Header";
import { BookerSection } from "@calcom/features/bookings/components/Section";
import { useAvailableTimeSlots } from "@calcom/features/bookings/Booker/hooks/useAvailableTimeSlots";
import { useBookerLayout } from "@calcom/features/bookings/Booker/hooks/useBookerLayout";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { LargeCalendar } from "@calcom/web/modules/calendar-view/components/LargeCalendar";
import { getUsernameList } from "@calcom/features/eventtypes/lib/defaultEvents";
import { useTimesForSchedule } from "@calcom/features/schedules/lib/use-schedule/useTimesForSchedule";

import { formatUsername } from "../booker/BookerPlatformWrapper";
import type {
  CalendarViewPlatformWrapperAtomPropsForIndividual,
  CalendarViewPlatformWrapperAtomPropsForTeam,
} from "../calendar-view/wrappers/CalendarViewPlatformWrapper";
import { useAtomGetPublicEvent } from "../hooks/event-types/public/useAtomGetPublicEvent";
import { useEventType } from "../hooks/event-types/public/useEventType";
import { useTeamEventType } from "../hooks/event-types/public/useTeamEventType";
import { useAvailableSlots } from "../hooks/useAvailableSlots";
import { AtomsWrapper } from "../src/components/atoms-wrapper";

export const EventTypeCalendarViewComponent = (
  props:
    | (CalendarViewPlatformWrapperAtomPropsForIndividual & {
        teamId?: number;
      })
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

  const event = useAtomGetPublicEvent({
    username,
    eventSlug: props.eventSlug,
    isTeamEvent: isTeamEvent,
    teamId,
    selectedDuration,
  });

  const bookerLayout = useBookerLayout(event.data?.profile?.bookerLayouts);

  const selectedDate = useBookerStoreContext((state) => state.selectedDate);
  const month = useBookerStoreContext((state) => state.month);
  const [dayCount] = useBookerStoreContext((state) => [state.dayCount, state.setDayCount], shallow);

  const [startTime, endTime] = useTimesForSchedule({
    month,
    dayCount,
    selectedDate,
    bookerLayout,
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
    orgSlug: undefined,
    eventTypeSlug: isDynamic ? "dynamic" : props.eventSlug || "",
  });

  const selectedEventDuration = useBookerStoreContext((state) => state.selectedDuration);
  const eventDuration = selectedEventDuration || event?.data?.length || 30;

  const availableTimeSlots = useAvailableTimeSlots({ schedule: schedule.data, eventDuration });

  return (
    <AtomsWrapper>
      <BookerSection area="header" className="bg-default dark:bg-muted sticky top-0 z-10">
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
        className="border-subtle sticky top-0 ml-[-1px] h-full md:border-l">
        <LargeCalendar
          extraDays={7}
          availableTimeslots={availableTimeSlots}
          isLoading={schedule.isPending}
          event={event}
        />
      </BookerSection>
    </AtomsWrapper>
  );
};
