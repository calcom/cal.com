import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";

import { createPaymentLink } from "@calcom/app-store/stripepayment/lib/client";
import { useHandleBookEvent } from "@calcom/atoms/monorepo";
import dayjs from "@calcom/dayjs";
import { sdkActionManager } from "@calcom/embed-core/embed-iframe";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import type { useEventReturnType } from "@calcom/features/bookings/Booker/utils/event";
import { updateQueryParam, getQueryParam } from "@calcom/features/bookings/Booker/utils/query-param";
import { createBooking, createRecurringBooking, createInstantBooking } from "@calcom/features/bookings/lib";
import { getFullName } from "@calcom/features/form-builder/utils";
import { useBookingSuccessRedirect } from "@calcom/lib/bookingSuccessRedirect";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookingStatus } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc";
import { showToast } from "@calcom/ui";

import type { UseBookingFormReturnType } from "./useBookingForm";

export interface IUseBookings {
  event: useEventReturnType;
  hashedLink?: string | null;
  bookingForm: UseBookingFormReturnType["bookingForm"];
  metadata: Record<string, string>;
}

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

export const useBookings = ({ event, hashedLink, bookingForm, metadata }: IUseBookings) => {
  const router = useRouter();
  const eventSlug = useBookerStore((state) => state.eventSlug);
  const rescheduleUid = useBookerStore((state) => state.rescheduleUid);
  const bookingData = useBookerStore((state) => state.bookingData);
  const timeslot = useBookerStore((state) => state.selectedTimeslot);
  const { t } = useLocale();
  const bookingSuccessRedirect = useBookingSuccessRedirect();
  const bookerFormErrorRef = useRef<HTMLDivElement>(null);
  const [instantMeetingTokenExpiryTime, setExpiryTime] = useState<Date | undefined>();
  const [instantVideoMeetingUrl, setInstantVideoMeetingUrl] = useState<string | undefined>();
  const duration = useBookerStore((state) => state.selectedDuration);

  const isRescheduling = !!rescheduleUid && !!bookingData;

  const bookingId = parseInt(getQueryParam("bookingId") || "0");

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

      if (!data) return;
      try {
        const locationVideoCallUrl: string | undefined = bookingMetadataSchema.parse(
          data.booking?.metadata || {}
        )?.videoCallUrl;

        if (locationVideoCallUrl) {
          setInstantVideoMeetingUrl(locationVideoCallUrl);
        } else {
          showToast(t("something_went_wrong_on_our_end"), "error");
        }
      } catch (err) {
        showToast(t("something_went_wrong_on_our_end"), "error");
      }
    },
    [_instantBooking.data]
  );

  const createBookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (responseData) => {
      const { uid, paymentUid } = responseData;
      const fullName = getFullName(bookingForm.getValues("responses.name"));

      const users = !!event.data?.hosts?.length
        ? event.data?.hosts.map((host) => host.user)
        : event.data?.users;

      const validDuration = event.data?.isDynamic
        ? duration || event.data?.length
        : duration && event.data?.metadata?.multipleDuration?.includes(duration)
        ? duration
        : event.data?.length;

      if (isRescheduling) {
        sdkActionManager?.fire("rescheduleBookingSuccessful", {
          booking: responseData,
          eventType: event.data,
          date: responseData?.startTime?.toString() || "",
          duration: validDuration,
          organizer: {
            name: users?.[0]?.name || "Nameless",
            email: responseData?.userPrimaryEmail || responseData.user?.email || "Email-less",
            timeZone: responseData.user?.timeZone || "Europe/London",
          },
          confirmed: !(responseData.status === BookingStatus.PENDING && event.data?.requiresConfirmation),
        });
      } else {
        sdkActionManager?.fire("bookingSuccessful", {
          booking: responseData,
          eventType: event.data,
          date: responseData?.startTime?.toString() || "",
          duration: validDuration,
          organizer: {
            name: users?.[0]?.name || "Nameless",
            email: responseData?.userPrimaryEmail || responseData.user?.email || "Email-less",
            timeZone: responseData.user?.timeZone || "Europe/London",
          },
          confirmed: !(responseData.status === BookingStatus.PENDING && event.data?.requiresConfirmation),
        });
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
        seatReferenceUid: "seatReferenceUid" in responseData ? responseData.seatReferenceUid : null,
        formerTime:
          isRescheduling && bookingData?.startTime ? dayjs(bookingData.startTime).toString() : undefined,
      };

      bookingSuccessRedirect({
        successRedirectUrl: event?.data?.successRedirectUrl || "",
        query,
        booking: responseData,
        forwardParamsSuccessRedirect:
          event?.data?.forwardParamsSuccessRedirect === undefined
            ? true
            : event?.data?.forwardParamsSuccessRedirect,
      });
    },
    onError: (err, _, ctx) => {
      // TODO:
      // const vercelId = ctx?.meta?.headers?.get("x-vercel-id");
      // if (vercelId) {
      //   setResponseVercelIdHeader(vercelId);
      // }
      bookerFormErrorRef && bookerFormErrorRef.current?.scrollIntoView({ behavior: "smooth" });
    },
  });

  const createInstantBookingMutation = useMutation({
    mutationFn: createInstantBooking,
    onSuccess: (responseData) => {
      updateQueryParam("bookingId", responseData.bookingId);
      setExpiryTime(responseData.expires);
    },
    onError: (err, _, ctx) => {
      console.error("Error creating instant booking", err);

      bookerFormErrorRef && bookerFormErrorRef.current?.scrollIntoView({ behavior: "smooth" });
    },
  });

  const createRecurringBookingMutation = useMutation({
    mutationFn: createRecurringBooking,
    onSuccess: async (responseData) => {
      const booking = responseData[0] || {};
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
  });

  const handleBookEvent = useHandleBookEvent({
    event,
    bookingForm,
    hashedLink,
    metadata,
    handleInstantBooking: createInstantBookingMutation.mutate,
    handleRecBooking: createRecurringBookingMutation.mutate,
    handleBooking: createBookingMutation.mutate,
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
  };
};
