"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { shallow } from "zustand/shallow";

import { createPaymentLink } from "@calcom/app-store/stripepayment/lib/client";
import { useHandleBookEvent } from "@calcom/atoms/hooks/bookings/useHandleBookEvent";
import dayjs from "@calcom/dayjs";
import { sdkActionManager } from "@calcom/embed-core/embed-iframe";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { updateQueryParam, getQueryParam } from "@calcom/features/bookings/Booker/utils/query-param";
import { storeDecoyBooking } from "@calcom/features/bookings/lib/client/decoyBookingStore";
import { createBooking } from "@calcom/features/bookings/lib/create-booking";
import { createInstantBooking } from "@calcom/features/bookings/lib/create-instant-booking";
import { createRecurringBooking } from "@calcom/features/bookings/lib/create-recurring-booking";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { getFullName } from "@calcom/features/form-builder/utils";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { localStorage } from "@calcom/lib/webstorage";
import { BookingStatus } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc";
import { showToast } from "@calcom/ui/components/toast";

import { useBookingSuccessRedirect } from "../../../lib/bookingSuccessRedirect";
import type { UseBookingFormReturnType } from "./useBookingForm";

export interface IUseBookings {
  event: {
    data?:
      | (Pick<
          BookerEvent,
          | "id"
          | "slug"
          | "subsetOfHosts"
          | "requiresConfirmation"
          | "isDynamic"
          | "metadata"
          | "forwardParamsSuccessRedirect"
          | "successRedirectUrl"
          | "length"
          | "recurringEvent"
          | "schedulingType"
        > & {
          subsetOfUsers: Pick<
            BookerEvent["subsetOfUsers"][number],
            "name" | "username" | "avatarUrl" | "weekStart" | "profile" | "bookerUrl"
          >[];
        })
      | null;
  };
  hashedLink?: string | null;
  bookingForm: UseBookingFormReturnType["bookingForm"];
  metadata: Record<string, string>;
  teamMemberEmail?: string | null;
  isBookingDryRun?: boolean;
}

const getBaseBookingEventPayload = (booking: {
  title?: string;
  startTime: string;
  endTime: string;
  eventTypeId?: number | null;
  status?: BookingStatus;
  paymentRequired: boolean;
  isRecurring: boolean;
  videoCallUrl?: string;
}) => {
  return {
    title: booking.title,
    startTime: booking.startTime,
    endTime: booking.endTime,
    eventTypeId: booking.eventTypeId,
    status: booking.status,
    paymentRequired: booking.paymentRequired,
    isRecurring: booking.isRecurring,
    videoCallUrl: booking.videoCallUrl,
  };
};

const getBookingSuccessfulEventPayload = (booking: {
  title?: string;
  startTime: string;
  endTime: string;
  eventTypeId?: number | null;
  status?: BookingStatus;
  paymentRequired: boolean;
  uid?: string;
  isRecurring: boolean;
  videoCallUrl?: string;
}) => {
  return {
    uid: booking.uid,
    ...getBaseBookingEventPayload(booking),
  };
};

const getRescheduleBookingSuccessfulEventPayload = getBookingSuccessfulEventPayload;

export const getDryRunBookingSuccessfulEventPayload = getBaseBookingEventPayload;

export const getDryRunRescheduleBookingSuccessfulEventPayload = getDryRunBookingSuccessfulEventPayload;
export interface IUseBookingLoadingStates {
  creatingBooking: boolean;
  creatingRecurringBooking: boolean;
  creatingInstantBooking: boolean;
}

export interface IUseBookingErrors {
  hasDataErrors: boolean;
  dataErrors: unknown;
}
export type UseBookingsReturnType = ReturnType<typeof useBookings>;

const STORAGE_KEY = "instantBookingData";
const COOLDOWN_STORAGE_KEY = "instantBookingCooldownByEvent";
const COOLDOWN_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

type InstantBookingCooldownMap = Record<string, number>;

const readInstantCooldownMap = (): InstantBookingCooldownMap => {
  try {
    const raw = localStorage.getItem(COOLDOWN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as InstantBookingCooldownMap) : {};
  } catch {
    return {};
  }
};

const writeInstantCooldownMap = (map: InstantBookingCooldownMap) => {
  try {
    localStorage.setItem(COOLDOWN_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // don't do anything
  }
};

const getInstantCooldownRemainingMs = (eventTypeId?: number | null): number => {
  if (!eventTypeId) return 0;
  const map = readInstantCooldownMap();
  const lastTs = map[String(eventTypeId)];
  if (!lastTs) return 0;
  const remaining = lastTs + COOLDOWN_WINDOW_MS - Date.now();
  return remaining > 0 ? remaining : 0;
};

const setInstantCooldownNow = (eventTypeId?: number | null) => {
  if (!eventTypeId) return;
  const map = readInstantCooldownMap();
  map[String(eventTypeId)] = Date.now();
  writeInstantCooldownMap(map);
};

const storeInLocalStorage = ({
  eventTypeId,
  expiryTime,
  bookingId,
}: {
  eventTypeId: number;
  expiryTime: Date;
  bookingId: number;
}) => {
  const value = JSON.stringify({ eventTypeId, expiryTime, bookingId });
  localStorage.setItem(STORAGE_KEY, value);
};

export const useBookings = ({ event, hashedLink, bookingForm, metadata, isBookingDryRun }: IUseBookings) => {
  const router = useRouter();
  const eventSlug = useBookerStoreContext((state) => state.eventSlug);
  const eventTypeId = useBookerStoreContext((state) => state.eventId);
  const isInstantMeeting = useBookerStoreContext((state) => state.isInstantMeeting);

  const [rescheduleUid, setRescheduleUid] = useBookerStoreContext(
    (state) => [state.rescheduleUid, state.setRescheduleUid],
    shallow
  );
  const rescheduledBy = useBookerStoreContext((state) => state.rescheduledBy);
  const [bookingData, setBookingData] = useBookerStoreContext(
    (state) => [state.bookingData, state.setBookingData],
    shallow
  );
  const timeslot = useBookerStoreContext((state) => state.selectedTimeslot);
  const { t } = useLocale();
  const bookingSuccessRedirect = useBookingSuccessRedirect();
  const bookerFormErrorRef = useRef<HTMLDivElement>(null);

  const [instantMeetingTokenExpiryTime, setExpiryTime] = useState<Date | undefined>();
  const [instantVideoMeetingUrl, setInstantVideoMeetingUrl] = useState<string | undefined>();
  const duration = useBookerStoreContext((state) => state.selectedDuration);

  const isRescheduling = !!rescheduleUid && !!bookingData;

  const bookingId = parseInt(getQueryParam("bookingId") ?? "0");

  useEffect(() => {
    if (!isInstantMeeting) return;

    const storedInfo = localStorage.getItem(STORAGE_KEY);

    if (storedInfo) {
      const parsedInfo = JSON.parse(storedInfo);

      const parsedInstantBookingInfo =
        parsedInfo.eventTypeId === eventTypeId &&
        isInstantMeeting &&
        new Date(parsedInfo.expiryTime) > new Date()
          ? parsedInfo
          : null;

      if (parsedInstantBookingInfo) {
        setExpiryTime(parsedInstantBookingInfo.expiryTime);
        updateQueryParam("bookingId", parsedInstantBookingInfo.bookingId);
      }
    }
  }, [eventTypeId, isInstantMeeting]);

  const instantConnectCooldownMs = getInstantCooldownRemainingMs(eventTypeId);

  const _instantBooking = trpc.viewer.bookings.getInstantBookingLocation.useQuery(
    {
      bookingId: bookingId,
    },
    {
      enabled: !!bookingId,
      refetchInterval: 2000,
      refetchIntervalInBackground: true,
    }
  );
  useEffect(
    function refactorMeWithoutEffect() {
      const data = _instantBooking.data;

      if (!data || !data.booking) return;
      try {
        const locationVideoCallUrl: string | undefined = bookingMetadataSchema.parse(
          data.booking?.metadata || {}
        )?.videoCallUrl;

        if (locationVideoCallUrl) {
          setInstantVideoMeetingUrl(locationVideoCallUrl);
        } else {
          showToast(t("something_went_wrong_on_our_end"), "error");
        }
      } catch {
        showToast(t("something_went_wrong_on_our_end"), "error");
      }
    },
    [_instantBooking.data]
  );

  const createBookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (booking) => {
      if (booking.isDryRun) {
        if (isRescheduling) {
          sdkActionManager?.fire(
            "dryRunRescheduleBookingSuccessfulV2",
            getDryRunRescheduleBookingSuccessfulEventPayload({
              ...booking,
              isRecurring: false,
            })
          );
        } else {
          sdkActionManager?.fire(
            "dryRunBookingSuccessfulV2",
            getDryRunBookingSuccessfulEventPayload({
              ...booking,
              isRecurring: false,
            })
          );
        }

        router.push("/booking/dry-run-successful");
        return;
      }

      if ("isShortCircuitedBooking" in booking && booking.isShortCircuitedBooking) {
        if (!booking.uid) {
          console.error("Decoy booking missing uid");
          return;
        }

        const bookingData = {
          uid: booking.uid,
          title: booking.title ?? null,
          startTime: booking.startTime,
          endTime: booking.endTime,
          booker: booking.attendees?.[0] ?? null,
          host: booking.user ?? null,
          location: booking.location ?? null,
        };

        storeDecoyBooking(bookingData);
        router.push(`/booking-successful/${booking.uid}`);
        return;
      }

      const { uid, paymentUid } = booking;
      const fullName = getFullName(bookingForm.getValues("responses.name"));

      const users = event.data?.subsetOfHosts?.length
        ? event.data?.subsetOfHosts.map((host) => host.user)
        : event.data?.subsetOfUsers;

      const validDuration = event.data?.isDynamic
        ? duration || event.data?.length
        : duration && event.data?.metadata?.multipleDuration?.includes(duration)
        ? duration
        : event.data?.length;

      if (isRescheduling) {
        sdkActionManager?.fire("rescheduleBookingSuccessful", {
          booking: booking,
          eventType: event.data,
          date: booking?.startTime?.toString() || "",
          duration: validDuration,
          organizer: {
            name: users?.[0]?.name || "Nameless",
            email: booking?.userPrimaryEmail || booking.user?.email || "Email-less",
            timeZone: booking.user?.timeZone || "Europe/London",
          },
          confirmed: !(booking.status === BookingStatus.PENDING && event.data?.requiresConfirmation),
        });
        sdkActionManager?.fire(
          "rescheduleBookingSuccessfulV2",
          getRescheduleBookingSuccessfulEventPayload({
            ...booking,
            isRecurring: false,
          })
        );
      } else {
        sdkActionManager?.fire("bookingSuccessful", {
          booking: booking,
          eventType: event.data,
          date: booking?.startTime?.toString() || "",
          duration: validDuration,
          organizer: {
            name: users?.[0]?.name || "Nameless",
            email: booking?.userPrimaryEmail || booking.user?.email || "Email-less",
            timeZone: booking.user?.timeZone || "Europe/London",
          },
          confirmed: !(booking.status === BookingStatus.PENDING && event.data?.requiresConfirmation),
        });

        sdkActionManager?.fire(
          "bookingSuccessfulV2",
          getBookingSuccessfulEventPayload({
            ...booking,
            isRecurring: false,
          })
        );
      }

      if (paymentUid) {
        router.push(
          createPaymentLink({
            paymentUid,
            date: timeslot,
            name: fullName,
            email: bookingForm.getValues("responses.email"),
            absolute: false,
          })
        );
        return;
      }

      if (!uid) {
        console.error("No uid returned from createBookingMutation");
        return;
      }

      const query = {
        isSuccessBookingPage: true,
        email: bookingForm.getValues("responses.email"),
        eventTypeSlug: eventSlug,
        seatReferenceUid: "seatReferenceUid" in booking ? (booking.seatReferenceUid as string) : null,
        formerTime:
          isRescheduling && bookingData?.startTime ? dayjs(bookingData.startTime).toString() : undefined,
        rescheduledBy, // ensure further reschedules performed on the success page are recorded correctly
      };

      bookingSuccessRedirect({
        successRedirectUrl: event?.data?.successRedirectUrl || "",
        query,
        booking: booking,
        forwardParamsSuccessRedirect:
          event?.data?.forwardParamsSuccessRedirect === undefined
            ? true
            : event?.data?.forwardParamsSuccessRedirect,
      });
    },
    onError: (err) => {
      if (bookerFormErrorRef?.current) {
        bookerFormErrorRef.current.scrollIntoView({ behavior: "smooth" });
      }

      const error = err as Error & {
        data: { rescheduleUid: string; startTime: string; attendees: string[] };
        traceId?: string;
      };

      if (error.message === ErrorCode.BookerLimitExceededReschedule && error.data?.rescheduleUid) {
        setRescheduleUid(error.data?.rescheduleUid);
        setBookingData({
          uid: error.data?.rescheduleUid,
          startTime: error.data?.startTime,
          attendees: error.data?.attendees,
        } as unknown as GetBookingType);
      }
    },
  });

  const createInstantBookingMutation = useMutation({
    mutationFn: createInstantBooking,
    onSuccess: (responseData) => {
      if (eventTypeId) {
        storeInLocalStorage({
          eventTypeId,
          expiryTime: responseData.expires,
          bookingId: responseData.bookingId,
        });
        setInstantCooldownNow(eventTypeId);
      }

      updateQueryParam("bookingId", responseData.bookingId);
      setExpiryTime(responseData.expires);
    },
    onError: (err) => {
      console.error("Error creating instant booking", err);
      if (bookerFormErrorRef?.current) {
        bookerFormErrorRef.current.scrollIntoView({ behavior: "smooth" });
      }
    },
  });

  const createRecurringBookingMutation = useMutation({
    mutationFn: createRecurringBooking,
    onSuccess: async (bookings) => {
      const booking = bookings[0] || {};

      if (booking.isDryRun) {
        if (isRescheduling) {
          sdkActionManager?.fire("dryRunRescheduleBookingSuccessfulV2", {
            ...getDryRunRescheduleBookingSuccessfulEventPayload({
              ...booking,
              isRecurring: true,
            }),
            allBookings: bookings.map((booking) => ({
              startTime: booking.startTime,
              endTime: booking.endTime,
            })),
          });
        } else {
          sdkActionManager?.fire("dryRunBookingSuccessfulV2", {
            ...getDryRunBookingSuccessfulEventPayload({
              ...booking,
              isRecurring: true,
            }),
            allBookings: bookings.map((booking) => ({
              startTime: booking.startTime,
              endTime: booking.endTime,
            })),
          });
        }

        router.push("/booking/dry-run-successful");
        return;
      }

      const { uid } = booking;

      if (!uid) {
        console.error("No uid returned from createRecurringBookingMutation");
        return;
      }

      const query = {
        isSuccessBookingPage: true,
        allRemainingBookings: true,
        email: bookingForm.getValues("responses.email"),
        eventTypeSlug: eventSlug,
        formerTime:
          isRescheduling && bookingData?.startTime ? dayjs(bookingData.startTime).toString() : undefined,
      };

      if (isRescheduling) {
        // NOTE: It is recommended to define the event payload in the argument itself to provide a better type safety.
        sdkActionManager?.fire("rescheduleBookingSuccessfulV2", {
          ...getRescheduleBookingSuccessfulEventPayload({
            ...booking,
            isRecurring: true,
          }),
          allBookings: bookings.map((booking) => ({
            startTime: booking.startTime,
            endTime: booking.endTime,
          })),
        });
      } else {
        sdkActionManager?.fire("bookingSuccessfulV2", {
          ...getBookingSuccessfulEventPayload({
            ...booking,
            isRecurring: true,
          }),
          allBookings: bookings.map((booking) => ({
            startTime: booking.startTime,
            endTime: booking.endTime,
          })),
        });
      }

      bookingSuccessRedirect({
        successRedirectUrl: event?.data?.successRedirectUrl || "",
        query,
        booking,
        forwardParamsSuccessRedirect:
          event?.data?.forwardParamsSuccessRedirect === undefined
            ? true
            : event?.data?.forwardParamsSuccessRedirect,
      });
    },
    onError: (err, _, ctx) => {
      console.error("Error creating recurring booking", err);
      // eslint-disable-next-line @calcom/eslint/no-scroll-into-view-embed -- It is only called when user takes an action in embed
      bookerFormErrorRef && bookerFormErrorRef.current?.scrollIntoView({ behavior: "smooth" });
    },
  });

  const handleBookEvent = useHandleBookEvent({
    event,
    bookingForm,
    hashedLink,
    metadata,
    handleInstantBooking: (variables: Parameters<typeof createInstantBookingMutation.mutate>[0]) => {
      const remaining = getInstantCooldownRemainingMs(eventTypeId);
      if (remaining > 0) {
        showToast(
          t("please_try_again_later_or_book_another_slot", { remaining: Math.ceil(remaining / 60000) }),
          "error"
        );
        return;
      }
      createInstantBookingMutation.mutate(variables);
    },
    handleRecBooking: createRecurringBookingMutation.mutate,
    handleBooking: createBookingMutation.mutate,
    isBookingDryRun,
  });

  const errors = {
    hasDataErrors: Boolean(
      createBookingMutation.isError ||
        createRecurringBookingMutation.isError ||
        createInstantBookingMutation.isError
    ),
    dataErrors:
      createBookingMutation.error ||
      createRecurringBookingMutation.error ||
      createInstantBookingMutation.error,
  };

  // A redirect is triggered on mutation success, so keep the loading state while it is happening.
  const loadingStates = {
    creatingBooking: createBookingMutation.isPending || createBookingMutation.isSuccess,
    creatingRecurringBooking:
      createRecurringBookingMutation.isPending || createRecurringBookingMutation.isSuccess,
    creatingInstantBooking: createInstantBookingMutation.isPending,
  };

  return {
    handleBookEvent,
    expiryTime: instantMeetingTokenExpiryTime,
    bookingForm,
    bookerFormErrorRef,
    errors,
    loadingStates,
    instantVideoMeetingUrl,
    instantConnectCooldownMs,
  };
};
