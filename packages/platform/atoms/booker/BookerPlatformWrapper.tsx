import { useMemo, useEffect } from "react";
import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";
import type { BookerProps } from "@calcom/features/bookings/Booker";
import { Booker as BookerComponent } from "@calcom/features/bookings/Booker";
import { useBookerLayout } from "@calcom/features/bookings/Booker/components/hooks/useBookerLayout";
import { useBookingForm } from "@calcom/features/bookings/Booker/components/hooks/useBookingForm";
import { useLocalSet } from "@calcom/features/bookings/Booker/components/hooks/useLocalSet";
import { useBookerStore, useInitializeBookerStore } from "@calcom/features/bookings/Booker/store";
import {
  useTimePreferences,
  mapBookingToMutationInput,
  mapRecurringBookingToMutationInput,
} from "@calcom/features/bookings/lib";
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

import { useAvailableSlots } from "../hooks/useAvailableSlots";
import { useCalendarsBusyTimes } from "../hooks/useCalendarsBusyTimes";
import { useConnectedCalendars } from "../hooks/useConnectedCalendars";
import { useCreateBooking } from "../hooks/useCreateBooking";
import { useCreateInstantBooking } from "../hooks/useCreateInstantBooking";
import { useCreateRecurringBooking } from "../hooks/useCreateRecurringBooking";
import { useMe } from "../hooks/useMe";
import { usePublicEvent } from "../hooks/usePublicEvent";
import { useSlots } from "../hooks/useSlots";

type BookerPlatformWrapperAtomProps = Omit<BookerProps, "entity"> & {
  rescheduleUid?: string;
  bookingUid?: string;
  firstName?: string;
  lastName?: string;
  guests?: string[];
  name?: string;
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
};

export const BookerPlatformWrapper = (props: BookerPlatformWrapperAtomProps) => {
  const [bookerState, setBookerState] = useBookerStore((state) => [state.state, state.setState], shallow);
  const setSelectedDate = useBookerStore((state) => state.setSelectedDate);
  const setSelectedTimeslot = useBookerStore((state) => state.setSelectedTimeslot);

  useEffect(() => {
    return () => {
      setBookerState("loading");
      setSelectedDate(null);
      setSelectedTimeslot(null);
    };
  }, []);

  const event = usePublicEvent({ username: props.username, eventSlug: props.eventSlug });
  const bookerLayout = useBookerLayout(event.data);
  useInitializeBookerStore({
    ...props,
    eventId: event.data?.id,
    rescheduleUid: props.rescheduleUid ?? null,
    bookingUid: props.bookingUid ?? null,
    layout: bookerLayout.defaultLayout,
    org: event.data?.entity.orgSlug,
  });
  const [dayCount] = useBookerStore((state) => [state.dayCount, state.setDayCount], shallow);
  const selectedDate = useBookerStore((state) => state.selectedDate);

  const month = useBookerStore((state) => state.month);
  const eventSlug = useBookerStore((state) => state.eventSlug);

  const selectedDuration = useBookerStore((state) => state.selectedDuration);

  const { data: session } = useMe();
  const hasSession = !!session;
  const prefillFormParams = useMemo(() => {
    return {
      name: props.name ?? null,
      guests: props.guests ?? [],
    };
  }, [props.name, props.guests]);
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
    usernameList: getUsernameList(props.username ?? ""),
    eventTypeId: event?.data?.id ?? 0,
    startTime,
    endTime,
    timeZone: session?.data?.user?.timeZone,
    duration: selectedDuration ?? undefined,
    rescheduleUid: props.rescheduleUid,
    enabled:
      Boolean(props.username) &&
      Boolean(month) &&
      Boolean(timezone) &&
      // Should only wait for one or the other, not both.
      (Boolean(eventSlug) || Boolean(event?.data?.id) || event?.data?.id === 0),
  });

  const bookerForm = useBookingForm({
    event: event.data,
    sessionEmail: session?.data?.user?.email,
    sessionUsername: session?.data?.user?.username,
    sessionName: session?.data?.user?.name,
    hasSession,
    extraOptions: {},
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
  const { data: connectedCalendars, isPending: fetchingConnectedCalendars } = useConnectedCalendars();
  const calendars = connectedCalendars as ApiSuccessResponse<ConnectedDestinationCalendars>;

  const { set, clearSet } = useLocalSet<{
    credentialId: number;
    externalId: string;
  }>("toggledConnectedCalendars", []);
  const { data: overlayBusyDates } = useCalendarsBusyTimes({
    loggedInUsersTz: session?.data?.user?.timeZone || "Europe/London",
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
  const timeslot = useBookerStore((state) => state.selectedTimeslot);
  const setFormValues = useBookerStore((state) => state.setFormValues);
  const recurringEventCount = useBookerStore((state) => state.recurringEventCount);
  const bookingData = useBookerStore((state) => state.bookingData);
  const seatedEventData = useBookerStore((state) => state.seatedEventData);

  const handleBookEvent = () => {
    const values = bookerForm.bookingForm.getValues();
    if (timeslot) {
      // Clears form values stored in store, so old values won't stick around.
      setFormValues({});
      bookerForm.bookingForm.clearErrors();

      // It shouldn't be possible that this method is fired without having event data,
      // but since in theory (looking at the types) it is possible, we still handle that case.
      if (!event?.data) {
        bookerForm.bookingForm.setError("globalError", {
          message: "An error occurred when booking the event, please refresh the page and try again",
        });
        return;
      }

      // Ensures that duration is an allowed value, if not it defaults to the
      // default event duration.
      const validDuration = event.data.isDynamic
        ? selectedDuration || event.data.length
        : selectedDuration && event.data.metadata?.multipleDuration?.includes(selectedDuration)
        ? selectedDuration
        : event.data.length;

      const bookingInput = {
        values,
        duration: validDuration,
        event: event.data,
        date: timeslot,
        timeZone: timezone,
        language: "en",
        rescheduleUid: props.rescheduleUid || undefined,
        bookingUid: (bookingData && bookingData.uid) || seatedEventData?.bookingUid || undefined,
        username: props.username || "",
        metadata: {},
        hashedLink: props.hashedLink,
      };

      if (props.isInstantMeeting) {
        createInstantBooking(mapBookingToMutationInput(bookingInput));
      } else if (event.data?.recurringEvent?.freq && recurringEventCount && !props.rescheduleUid) {
        createRecBooking(mapRecurringBookingToMutationInput(bookingInput, recurringEventCount));
      } else {
        createBooking(mapBookingToMutationInput(bookingInput));
      }
      // Clears form values stored in store, so old values won't stick around.
      setFormValues({});
      bookerForm.bookingForm.clearErrors();
    }
  };

  return (
    <BookerComponent
      eventSlug={props.eventSlug}
      username={props.username}
      entity={
        event?.data?.entity ?? {
          isUnpublished: undefined,
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
      onOverlaySwitchStateChange={function (state: boolean): void {
        throw new Error("Function not implemented.");
      }}
      extraOptions={{}}
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
      }}
      slots={slots}
      calendars={{
        overlayBusyDates: overlayBusyDates?.data,
        isOverlayCalendarEnabled: false,
        connectedCalendars: calendars?.data.connectedCalendars || [],
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
      }}
      bookerForm={bookerForm}
      event={event}
      schedule={schedule}
      bookerLayout={bookerLayout}
      verifyCode={undefined}
      isPlatform
    />
  );
};
