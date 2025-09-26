import { AtomsWrapper } from "@/components/atoms-wrapper";
import { useMemo, useEffect, useState } from "react";
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
import { getRoutedTeamMemberIdsFromSearchParams } from "@calcom/lib/bookings/getRoutedTeamMemberIdsFromSearchParams";
import { BookerLayouts } from "@calcom/prisma/zod-utils";

import { formatUsername } from "../../booker/BookerPlatformWrapper";
import type {
  BookerPlatformWrapperAtomPropsForIndividual,
  BookerPlatformWrapperAtomPropsForTeam,
} from "../../booker/types";
import { useGetBookingForReschedule } from "../../hooks/bookings/useGetBookingForReschedule";
import { useAtomGetPublicEvent } from "../../hooks/event-types/public/useAtomGetPublicEvent";
import { useEventType } from "../../hooks/event-types/public/useEventType";
import { useTeamEventType } from "../../hooks/event-types/public/useTeamEventType";
import { useAvailableSlots } from "../../hooks/useAvailableSlots";

const CalendarViewPlatformWrapperComponent = (
  props: BookerPlatformWrapperAtomPropsForIndividual | BookerPlatformWrapperAtomPropsForTeam
) => {
  const {
    eventSlug,
    isTeamEvent,
    hostsLimit,
    allowUpdatingUrlParams = false,
    teamMemberEmail,
    crmAppSlug,
    crmOwnerRecordType,
    view = "MONTH_VIEW",
  } = props;

  const teamId: number | undefined = props.isTeamEvent ? props.teamId : undefined;
  const username = useMemo(() => {
    if (props.username) {
      return formatUsername(props.username);
    }
    return "";
  }, [props.username]);

  const { isPending } = useEventType(username, eventSlug, isTeamEvent);
  const { isPending: isTeamPending } = useTeamEventType(teamId, eventSlug, isTeamEvent, hostsLimit);

  const setSelectedDuration = useBookerStoreContext((state) => state.setSelectedDuration);
  const selectedDuration = useBookerStoreContext((state) => state.selectedDuration);

  const event = useAtomGetPublicEvent({
    username,
    eventSlug: props.eventSlug,
    isTeamEvent: props.isTeamEvent,
    teamId,
    selectedDuration,
  });

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

  useEffect(() => {
    setSelectedDuration(props.duration ?? null);
  }, [props.duration, setSelectedDuration]);

  const { timezone } = useTimePreferences();
  const isDynamic = useMemo(() => {
    return getUsernameList(username ?? "").length > 1;
  }, [username]);

  const [routingParams, setRoutingParams] = useState<{
    routedTeamMemberIds?: number[];
    _shouldServeCache?: boolean;
    skipContactOwner?: boolean;
    isBookingDryRun?: boolean;
  }>({});

  useEffect(() => {
    const searchParams = props.routingFormSearchParams
      ? new URLSearchParams(props.routingFormSearchParams)
      : new URLSearchParams(window.location.search);

    const routedTeamMemberIds = getRoutedTeamMemberIdsFromSearchParams(searchParams);
    const skipContactOwner = searchParams.get("cal.skipContactOwner") === "true";

    const _cacheParam = searchParams?.get("cal.cache");
    const _shouldServeCache = _cacheParam ? _cacheParam === "true" : undefined;
    const isBookingDryRun =
      searchParams?.get("cal.isBookingDryRun")?.toLowerCase() === "true" ||
      searchParams?.get("cal.sandbox")?.toLowerCase() === "true";
    setRoutingParams({
      ...(skipContactOwner ? { skipContactOwner } : {}),
      ...(routedTeamMemberIds ? { routedTeamMemberIds } : {}),
      ...(_shouldServeCache ? { _shouldServeCache } : {}),
      ...(isBookingDryRun ? { isBookingDryRun } : {}),
    });
  }, [props.routingFormSearchParams]);
  const bookingData = useBookerStoreContext((state) => state.bookingData);
  const setBookingData = useBookerStoreContext((state) => state.setBookingData);
  const layout = BookerLayouts[view];

  useGetBookingForReschedule({
    uid: props.rescheduleUid ?? props.bookingUid ?? "",
    onSuccess: (data) => {
      setBookingData(data);
    },
  });

  useInitializeBookerStoreContext({
    ...props,
    teamMemberEmail,
    crmAppSlug,
    crmOwnerRecordType,
    crmRecordId: props.crmRecordId,
    eventId: event?.data?.id,
    rescheduleUid: props.rescheduleUid ?? null,
    bookingUid: props.bookingUid ?? null,
    layout: layout,
    org: props.entity?.orgSlug,
    username,
    bookingData,
    isPlatform: true,
    allowUpdatingUrlParams,
  });

  const schedule = useAvailableSlots({
    usernameList: getUsernameList(username),
    eventTypeId: event?.data?.id ?? 0,
    startTime,
    endTime,
    timeZone: timezone,
    duration: selectedDuration ?? undefined,
    rescheduleUid: props.rescheduleUid,
    teamMemberEmail: props.teamMemberEmail ?? undefined,
    ...(props.isTeamEvent
      ? {
          isTeamEvent: props.isTeamEvent,
          teamId: teamId,
        }
      : {}),
    enabled:
      Boolean(teamId || username) &&
      Boolean(month) &&
      Boolean(timezone) &&
      (props.isTeamEvent ? !isTeamPending : !isPending) &&
      Boolean(event?.data?.id),
    orgSlug: props.entity?.orgSlug ?? undefined,
    eventTypeSlug: isDynamic ? "dynamic" : eventSlug || "",
    ...routingParams,
  });

  return (
    <AtomsWrapper>
      <BookerSection area="header" className="bg-default dark:bg-muted sticky top-0 z-10">
        <Header
          isCalendarView={true}
          isMyLink={true}
          eventSlug={eventSlug}
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
        <LargeCalendar extraDays={7} schedule={schedule.data} isLoading={schedule.isPending} event={event} />
      </BookerSection>
    </AtomsWrapper>
  );
};

export const CalendarViewPlatformWrapper = (
  props: BookerPlatformWrapperAtomPropsForIndividual | BookerPlatformWrapperAtomPropsForTeam
) => {
  return (
    <BookerStoreProvider>
      <CalendarViewPlatformWrapperComponent {...props} />
    </BookerStoreProvider>
  );
};
