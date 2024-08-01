import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useEffect } from "react";
import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";
import type { BookerProps } from "@calcom/features/bookings/Booker";
import { Booker as BookerComponent } from "@calcom/features/bookings/Booker";
import { useOverlayCalendarStore } from "@calcom/features/bookings/Booker/components/OverlayCalendar/store";
import { useBookerLayout } from "@calcom/features/bookings/Booker/components/hooks/useBookerLayout";
import { useBookingForm } from "@calcom/features/bookings/Booker/components/hooks/useBookingForm";
import { useLocalSet } from "@calcom/features/bookings/Booker/components/hooks/useLocalSet";
import { useBookerStore, useInitializeBookerStore } from "@calcom/features/bookings/Booker/store";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { useTimesForSchedule } from "@calcom/features/schedules/lib/use-schedule/useTimesForSchedule";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import type { ConnectedDestinationCalendars } from "@calcom/platform-libraries";
import type { BookingResponse } from "@calcom/platform-libraries";
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  ApiSuccessResponseWithoutData,
} from "@calcom/platform-types";
import { BookerLayouts } from "@calcom/prisma/zod-utils";

import {
  transformApiEventTypeForAtom,
  transformApiTeamEventTypeForAtom,
} from "../event-types/atom-api-transformers/transformApiEventTypeForAtom";
import { useEventType } from "../hooks/event-types/public/useEventType";
import { useTeamEventType } from "../hooks/event-types/public/useTeamEventType";
import { useAtomsContext } from "../hooks/useAtomsContext";
import { useAvailableSlots } from "../hooks/useAvailableSlots";
import { useCalendarsBusyTimes } from "../hooks/useCalendarsBusyTimes";
import { useConnectedCalendars } from "../hooks/useConnectedCalendars";
import type { UseCreateBookingInput } from "../hooks/useCreateBooking";
import { useCreateBooking } from "../hooks/useCreateBooking";
import { useCreateInstantBooking } from "../hooks/useCreateInstantBooking";
import { useCreateRecurringBooking } from "../hooks/useCreateRecurringBooking";
import {
  useGetBookingForReschedule,
  QUERY_KEY as BOOKING_RESCHEDULE_KEY,
} from "../hooks/useGetBookingForReschedule";
import { useHandleBookEvent } from "../hooks/useHandleBookEvent";
import { useMe } from "../hooks/useMe";
import { useSlots } from "../hooks/useSlots";
import { AtomsWrapper } from "../src/components/atoms-wrapper";

export type BookerPlatformWrapperAtomProps = Omit<BookerProps, "username" | "entity"> & {
  rescheduleUid?: string;
  bookingUid?: string;
  username: string | string[] | undefined;
  entity?: BookerProps["entity"];
  // values for the booking form and booking fields
  defaultFormValues?: {
    firstName?: string;
    lastName?: string;
    guests?: string[];
    name?: string;
    email?: string;
    notes?: string;
    rescheduleReason?: string;
  } & Record<string, string | string[]>;
  handleCreateBooking?: (input: UseCreateBookingInput) => void;
  onCreateBookingSuccess?: (data: ApiSuccessResponse<BookingResponse>) => void;
  onCreateBookingError?: (data: ApiErrorResponse | Error) => void;
  onCreateRecurringBookingSuccess?: (data: ApiSuccessResponse<BookingResponse[]>) => void;
  onCreateRecurringBookingError?: (data: ApiErrorResponse | Error) => void;
  onCreateInstantBookingSuccess?: (data: ApiSuccessResponse<BookingResponse>) => void;
  onCreateInstantBookingError?: (data: ApiErrorResponse | Error) => void;
  onReserveSlotSuccess?: (data: ApiSuccessResponse<string>) => void;
  onReserveSlotError?: (data: ApiErrorResponse) => void;
  onDeleteSlotSuccess?: (data: ApiSuccessResponseWithoutData) => void;
  onDeleteSlotError?: (data: ApiErrorResponse) => void;
  locationUrl?: string;
  teamId?: number;
};

export const BookerPlatformWrapper = (props: BookerPlatformWrapperAtomProps) => {
  const { clientId } = useAtomsContext();
  const [bookerState, setBookerState] = useBookerStore((state) => [state.state, state.setState], shallow);
  const setSelectedDate = useBookerStore((state) => state.setSelectedDate);
  const setSelectedDuration = useBookerStore((state) => state.setSelectedDuration);
  const setBookingData = useBookerStore((state) => state.setBookingData);
  const setOrg = useBookerStore((state) => state.setOrg);
  const bookingData = useBookerStore((state) => state.bookingData);
  const setSelectedTimeslot = useBookerStore((state) => state.setSelectedTimeslot);
  const setSelectedMonth = useBookerStore((state) => state.setMonth);
  useGetBookingForReschedule({
    uid: props.rescheduleUid ?? props.bookingUid ?? "",
    onSuccess: (data) => {
      setBookingData(data);
    },
  });
  const queryClient = useQueryClient();
  const username = useMemo(() => {
    if (props.username) {
      return formatUsername(props.username);
    }
    return "";
  }, [props.username]);

  setSelectedDuration(props.duration ?? null);
  setOrg(props.entity?.orgSlug ?? null);

  const isDynamic = useMemo(() => {
    return getUsernameList(username ?? "").length > 1;
  }, [username]);

  const { isSuccess, isError, isPending, data } = useEventType(username, props.eventSlug, props.isTeamEvent);
  const {
    isSuccess: isTeamSuccess,
    isError: isTeamError,
    isPending: isTeamPending,
    data: teamData,
  } = useTeamEventType(props.teamId, props.eventSlug, props.isTeamEvent);

  const event = useMemo(() => {
    if (props.isTeamEvent) {
      return {
        isSuccess: isTeamSuccess,
        isError: isTeamError,
        isPending: isTeamPending,
        data:
          teamData && teamData.length > 0
            ? transformApiTeamEventTypeForAtom(teamData[0], props.entity)
            : undefined,
      };
    }

    return {
      isSuccess,
      isError,
      isPending,
      data: data && data.length > 0 ? transformApiEventTypeForAtom(data[0], props.entity) : undefined,
    };
  }, [
    props.isTeamEvent,
    props.entity,
    isSuccess,
    isError,
    isPending,
    data,
    isTeamSuccess,
    isTeamError,
    isTeamPending,
    teamData,
  ]);

  if (isDynamic && props.duration && event.data) {
    // note(Lauris): Mandatory - In case of "dynamic" event type default event duration returned by the API is 30,
    // but we are re-using the dynamic event type as a team event, so we must set the event length to whatever the event length is.
    event.data.length = props.duration;
  }

  const bookerLayout = useBookerLayout(event.data);
  useInitializeBookerStore({
    ...props,
    eventId: event.data?.id,
    rescheduleUid: props.rescheduleUid ?? null,
    bookingUid: props.bookingUid ?? null,
    layout: bookerLayout.defaultLayout,
    org: props.entity?.orgSlug,
    username,
    bookingData,
  });
  const [dayCount] = useBookerStore((state) => [state.dayCount, state.setDayCount], shallow);
  const selectedDate = useBookerStore((state) => state.selectedDate);

  const month = useBookerStore((state) => state.month);
  const eventSlug = useBookerStore((state) => state.eventSlug);

  const selectedDuration = useBookerStore((state) => state.selectedDuration);

  const { data: session } = useMe();
  const hasSession = !!session;
  const { name: defaultName, guests: defaultGuests, ...restFormValues } = props.defaultFormValues ?? {};
  const prefillFormParams = useMemo(() => {
    return {
      name: defaultName ?? null,
      guests: defaultGuests ?? [],
    };
  }, [defaultName, defaultGuests]);

  const extraOptions = useMemo(() => {
    return restFormValues;
  }, [restFormValues]);
  const date = dayjs(selectedDate).format("YYYY-MM-DD");

  const prefetchNextMonth =
    (bookerLayout.layout === BookerLayouts.WEEK_VIEW &&
      !!bookerLayout.extraDays &&
      dayjs(date).month() !== dayjs(date).add(bookerLayout.extraDays, "day").month()) ||
    (bookerLayout.layout === BookerLayouts.COLUMN_VIEW &&
      dayjs(date).month() !== dayjs(date).add(bookerLayout.columnViewExtraDays.current, "day").month());

  const monthCount =
    ((bookerLayout.layout !== BookerLayouts.WEEK_VIEW && bookerState === "selecting_time") ||
      bookerLayout.layout === BookerLayouts.COLUMN_VIEW) &&
    dayjs(date).add(1, "month").month() !==
      dayjs(date).add(bookerLayout.columnViewExtraDays.current, "day").month()
      ? 2
      : undefined;
  const { timezone } = useTimePreferences();

  const [startTime, endTime] = useTimesForSchedule({
    month,
    monthCount,
    dayCount,
    prefetchNextMonth,
    selectedDate,
  });

  const schedule = useAvailableSlots({
    usernameList: getUsernameList(username ?? ""),
    eventTypeId: event?.data?.id ?? 0,
    startTime,
    endTime,
    timeZone: session?.data?.timeZone,
    duration: selectedDuration ?? undefined,
    rescheduleUid: props.rescheduleUid,
    enabled:
      Boolean(username) &&
      Boolean(month) &&
      Boolean(timezone) &&
      // Should only wait for one or the other, not both.
      (Boolean(eventSlug) || Boolean(event?.data?.id) || event?.data?.id === 0),
    orgSlug: props.entity?.orgSlug ?? undefined,
    eventTypeSlug: isDynamic ? "dynamic" : eventSlug || "",
  });

  const bookerForm = useBookingForm({
    event: event.data,
    sessionEmail:
      session?.data?.email && clientId
        ? session.data.email.replace(`+${clientId}`, "")
        : session?.data?.email,
    sessionUsername: session?.data?.username,
    sessionName: session?.data?.username,
    hasSession,
    extraOptions: extraOptions ?? {},
    prefillFormParams: prefillFormParams,
  });
  const {
    mutate: createBooking,
    isPending: creatingBooking,
    error: createBookingError,
    isError: isCreateBookingError,
  } = useCreateBooking({
    onSuccess: (data) => {
      schedule.refetch();
      props.onCreateBookingSuccess?.(data);
    },
    onError: props.onCreateBookingError,
  });
  const {
    mutate: createRecBooking,
    isPending: creatingRecBooking,

    error: createRecBookingError,
    isError: isCreateRecBookingError,
  } = useCreateRecurringBooking({
    onSuccess: (data) => {
      schedule.refetch();
      props.onCreateRecurringBookingSuccess?.(data);
    },
    onError: props.onCreateRecurringBookingError,
  });
  const {
    mutate: createInstantBooking,
    isPending: creatingInstantBooking,
    error: createInstantBookingError,
    isError: isCreateInstantBookingError,
  } = useCreateInstantBooking({
    onSuccess: (data) => {
      schedule.refetch();
      props.onCreateInstantBookingSuccess?.(data);
    },
    onError: props.onCreateInstantBookingError,
  });

  const slots = useSlots(event);
  const [calendarSettingsOverlay] = useOverlayCalendarStore(
    (state) => [state.calendarSettingsOverlayModal, state.setCalendarSettingsOverlayModal],
    shallow
  );
  const { data: connectedCalendars, isPending: fetchingConnectedCalendars } = useConnectedCalendars({
    enabled: !!calendarSettingsOverlay,
  });
  const calendars = connectedCalendars as ConnectedDestinationCalendars;

  const { set, clearSet } = useLocalSet<{
    credentialId: number;
    externalId: string;
  }>("toggledConnectedCalendars", []);
  const { data: overlayBusyDates } = useCalendarsBusyTimes({
    loggedInUsersTz: session?.data?.timeZone || "Europe/London",
    dateFrom: selectedDate,
    dateTo: selectedDate,
    calendarsToLoad: Array.from(set).map((item) => ({
      credentialId: item.credentialId,
      externalId: item.externalId,
    })),
    onError: () => {
      clearSet();
    },
    enabled: Boolean(
      hasSession && set.size > 0 && localStorage?.getItem("overlayCalendarSwitchDefault") === "true"
    ),
  });

  const handleBookEvent = useHandleBookEvent({
    event,
    bookingForm: bookerForm.bookingForm,
    hashedLink: props.hashedLink,
    metadata: {},
    handleBooking: props?.handleCreateBooking ?? createBooking,
    handleInstantBooking: createInstantBooking,
    handleRecBooking: createRecBooking,
    locationUrl: props.locationUrl,
  });

  useEffect(() => {
    // reset booker whenever it's unmounted
    return () => {
      slots.handleRemoveSlot();
      setBookerState("loading");
      setSelectedDate(null);
      setSelectedTimeslot(null);
      setSelectedDuration(null);
      setOrg(null);
      setSelectedMonth(null);
      setSelectedDuration(null);
      if (props.rescheduleUid) {
        // clean booking data from cache
        queryClient.removeQueries({
          queryKey: [BOOKING_RESCHEDULE_KEY, props.rescheduleUid],
          exact: true,
        });
        setBookingData(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AtomsWrapper>
      <BookerComponent
        customClassNames={props.customClassNames}
        eventSlug={props.eventSlug}
        username={username}
        entity={
          event?.data?.entity ?? {
            considerUnpublished: false,
            orgSlug: undefined,
            teamSlug: undefined,
            name: undefined,
          }
        }
        rescheduleUid={props.rescheduleUid ?? null}
        bookingUid={props.bookingUid ?? null}
        isRedirect={false}
        fromUserNameRedirected=""
        hasSession={hasSession}
        onGoBackInstantMeeting={function (): void {
          throw new Error("Function not implemented.");
        }}
        onConnectNowInstantMeeting={function (): void {
          throw new Error("Function not implemented.");
        }}
        onOverlayClickNoCalendar={function (): void {
          throw new Error("Function not implemented.");
        }}
        onClickOverlayContinue={function (): void {
          throw new Error("Function not implemented.");
        }}
        onOverlaySwitchStateChange={function (): void {
          throw new Error("Function not implemented.");
        }}
        extraOptions={extraOptions ?? {}}
        bookings={{
          handleBookEvent: () => {
            handleBookEvent();
            return;
          },
          expiryTime: undefined,
          bookingForm: bookerForm.bookingForm,
          bookerFormErrorRef: bookerForm.bookerFormErrorRef,
          errors: {
            hasDataErrors: isCreateBookingError || isCreateRecBookingError || isCreateInstantBookingError,
            dataErrors: createBookingError || createRecBookingError || createInstantBookingError,
          },
          loadingStates: {
            creatingBooking: creatingBooking,
            creatingRecurringBooking: creatingRecBooking,
            creatingInstantBooking: creatingInstantBooking,
          },
          instantVideoMeetingUrl: undefined,
        }}
        slots={slots}
        calendars={{
          overlayBusyDates: overlayBusyDates?.data,
          isOverlayCalendarEnabled: false,
          connectedCalendars: calendars?.connectedCalendars || [],
          loadingConnectedCalendar: fetchingConnectedCalendars,
          onToggleCalendar: () => {
            return;
          },
        }}
        verifyEmail={{
          isEmailVerificationModalVisible: false,
          setEmailVerificationModalVisible: () => {
            return;
          },
          setVerifiedEmail: () => {
            return;
          },
          handleVerifyEmail: () => {
            return;
          },
          renderConfirmNotVerifyEmailButtonCond: true,
          isVerificationCodeSending: false,
        }}
        bookerForm={bookerForm}
        event={event}
        schedule={schedule}
        bookerLayout={bookerLayout}
        verifyCode={undefined}
        isPlatform
      />
    </AtomsWrapper>
  );
};

function formatUsername(username: string | string[]): string {
  if (typeof username === "string") {
    return username;
  }
  return username.join("+");
}
