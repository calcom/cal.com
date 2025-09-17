import { AtomsWrapper } from "@/components/atoms-wrapper";
import { useMemo, useEffect, useState } from "react";
import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";
import type { BookerProps } from "@calcom/features/bookings/Booker";
import {
  BookerStoreProvider,
  useBookerStoreContext,
  useInitializeBookerStoreContext,
} from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { Header } from "@calcom/features/bookings/Booker/components/Header";
import { BookerSection } from "@calcom/features/bookings/Booker/components/Section";
import { useBookerLayout } from "@calcom/features/bookings/Booker/components/hooks/useBookerLayout";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { LargeCalendar } from "@calcom/features/calendar-view/LargeCalendar";
import { useTimesForSchedule } from "@calcom/features/schedules/lib/use-schedule/useTimesForSchedule";
import { getRoutedTeamMemberIdsFromSearchParams } from "@calcom/lib/bookings/getRoutedTeamMemberIdsFromSearchParams";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import type { RoutingFormSearchParams } from "@calcom/platform-types";
import { BookerLayouts } from "@calcom/prisma/zod-utils";

import { useGetBookingForReschedule } from "../../hooks/bookings/useGetBookingForReschedule";
import { useAtomGetPublicEvent } from "../../hooks/event-types/public/useAtomGetPublicEvent";
import { useEventType } from "../../hooks/event-types/public/useEventType";
import { useTeamEventType } from "../../hooks/event-types/public/useTeamEventType";
import { useAvailableSlots } from "../../hooks/useAvailableSlots";

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
  rescheduleUid?: string;
  duration?: number | null;
  teamMemberEmail?: string | null;
  routingFormSearchParams?: RoutingFormSearchParams;
  bookingUid?: string;
  allowUpdatingUrlParams?: boolean;
  crmAppSlug?: string | null;
  crmOwnerRecordType?: string | null;
  crmRecordId?: string | null;
  view?: "MONTH_VIEW" | "WEEK_VIEW" | "COLUMN_VIEW";
};

const CalendarViewPlatformWrapperComponent = (props: CalendarViewPlatformWrapperProps) => {
  const {
    username,
    eventSlug,
    isTeamEvent,
    teamId,
    hostsLimit,
    allowUpdatingUrlParams = false,
    teamMemberEmail,
    crmAppSlug,
    crmOwnerRecordType,
    view = "MONTH_VIEW",
  } = props;

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
  const monthCount =
    ((bookerLayout.layout !== BookerLayouts.WEEK_VIEW && bookerState === "selecting_time") ||
      bookerLayout.layout === BookerLayouts.COLUMN_VIEW) &&
    dayjs(date).add(1, "month").month() !==
      dayjs(date).add(bookerLayout.columnViewExtraDays.current, "day").month()
      ? 2
      : undefined;
  const month = useBookerStoreContext((state) => state.month);
  const [dayCount] = useBookerStoreContext((state) => [state.dayCount, state.setDayCount], shallow);

  const prefetchNextMonth =
    (bookerLayout.layout === BookerLayouts.WEEK_VIEW &&
      !!bookerLayout.extraDays &&
      dayjs(date).month() !== dayjs(date).add(bookerLayout.extraDays, "day").month()) ||
    (bookerLayout.layout === BookerLayouts.COLUMN_VIEW &&
      dayjs(date).month() !== dayjs(date).add(bookerLayout.columnViewExtraDays.current, "day").month());

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
      <BookerSection
        key="large-calendar"
        area="main"
        visible={true}
        className="border-subtle sticky top-0 ml-[-1px] h-full md:border-l">
        <Header
          isCalendarView={true}
          isMyLink={true}
          eventSlug={eventSlug}
          enabledLayouts={bookerLayout.bookerLayouts.enabledLayouts}
          extraDays={7}
          isMobile={false}
          nextSlots={6}
        />

        <LargeCalendar
          // large calendar needs to be its own component so that it can be used in the booker
          // need to use the displayStartDate prop to make sure we always pass in monday of the following week
          extraDays={7}
          schedule={schedule.data}
          isLoading={schedule.isPending}
          event={event}
        />
      </BookerSection>
    </AtomsWrapper>
  );
};

export const CalendarViewPlatformWrapper = (props: CalendarViewPlatformWrapperProps) => {
  return (
    <BookerStoreProvider>
      <CalendarViewPlatformWrapperComponent {...props} />
    </BookerStoreProvider>
  );
};
