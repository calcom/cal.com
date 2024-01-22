import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

import { createPaymentLink } from "@calcom/app-store/stripepayment/lib/client";
import dayjs from "@calcom/dayjs";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import type { useEventReturnType } from "@calcom/features/bookings/Booker/utils/event";
import { updateQueryParam, getQueryParam } from "@calcom/features/bookings/Booker/utils/query-param";
import {
  createBooking,
  createRecurringBooking,
  mapBookingToMutationInput,
  mapRecurringBookingToMutationInput,
  createInstantBooking,
  useTimePreferences,
} from "@calcom/features/bookings/lib";
import { getFullName } from "@calcom/features/form-builder/utils";
import { useBookingSuccessRedirect } from "@calcom/lib/bookingSuccessRedirect";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc";
import { showToast } from "@calcom/ui";

import type { useBookingFormReturnType } from "./useBookingForm";

export interface IUseBookings {
  event: useEventReturnType;
  hashedLink?: string | null;
  bookingForm: useBookingFormReturnType["bookingForm"];
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

export const useBookings = ({ event, hashedLink, bookingForm }: IUseBookings) => {
  const router = useRouter();
  const eventSlug = useBookerStore((state) => state.eventSlug);
  const setFormValues = useBookerStore((state) => state.setFormValues);
  const rescheduleUid = useBookerStore((state) => state.rescheduleUid);
  const bookingData = useBookerStore((state) => state.bookingData);
  const timeslot = useBookerStore((state) => state.selectedTimeslot);
  const seatedEventData = useBookerStore((state) => state.seatedEventData);
  const { t, i18n } = useLocale();
  const bookingSuccessRedirect = useBookingSuccessRedirect();
  const bookerFormErrorRef = useRef<HTMLDivElement>(null);
  const [expiryTime, setExpiryTime] = useState<Date | undefined>();
  const recurringEventCount = useBookerStore((state) => state.recurringEventCount);
  const isInstantMeeting = useBookerStore((state) => state.isInstantMeeting);
  const duration = useBookerStore((state) => state.selectedDuration);
  const { timezone } = useTimePreferences();
  const username = useBookerStore((state) => state.username);
  const routerQuery = useRouterQuery();
  const searchParams = useSearchParams();

  const isRescheduling = !!rescheduleUid && !!bookingData;

  const bookingId = parseInt(getQueryParam("bookingId") || "0");
  const hasInstantMeetingTokenExpired = expiryTime && new Date(expiryTime) < new Date();
  const _instantBooking = trpc.viewer.bookings.getInstantBookingLocation.useQuery(
    {
      bookingId: bookingId,
    },
    {
      enabled: !!bookingId && !hasInstantMeetingTokenExpired,
      refetchInterval: 2000,
      onSuccess: (data) => {
        try {
          showToast(t("something_went_wrong_on_our_end"), "error");

          const locationVideoCallUrl: string | undefined = bookingMetadataSchema.parse(
            data.booking?.metadata || {}
          )?.videoCallUrl;

          if (locationVideoCallUrl) {
            router.push(locationVideoCallUrl);
          } else {
            showToast(t("something_went_wrong_on_our_end"), "error");
          }
        } catch (err) {
          showToast(t("something_went_wrong_on_our_end"), "error");
        }
      },
    }
  );

  const createBookingMutation = useMutation(createBooking, {
    onSuccess: (responseData) => {
      const { uid, paymentUid } = responseData;
      const fullName = getFullName(bookingForm.getValues("responses.name"));
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

  const createInstantBookingMutation = useMutation(createInstantBooking, {
    onSuccess: (responseData) => {
      updateQueryParam("bookingId", responseData.bookingId);
      setExpiryTime(responseData.expires);
    },
    onError: (err, _, ctx) => {
      console.error("Error creating instant booking", err);

      bookerFormErrorRef && bookerFormErrorRef.current?.scrollIntoView({ behavior: "smooth" });
    },
  });

  const createRecurringBookingMutation = useMutation(createRecurringBooking, {
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
      });
    },
  });

  const handleBookEvent = () => {
    const values = bookingForm.getValues();
    if (timeslot) {
      // Clears form values stored in store, so old values won't stick around.
      setFormValues({});
      bookingForm.clearErrors();

      // It shouldn't be possible that this method is fired without having event data,
      // but since in theory (looking at the types) it is possible, we still handle that case.
      if (!event?.data) {
        bookingForm.setError("globalError", { message: t("error_booking_event") });
        return;
      }

      // Ensures that duration is an allowed value, if not it defaults to the
      // default event duration.
      const validDuration = event.data.isDynamic
        ? duration || event.data.length
        : duration && event.data.metadata?.multipleDuration?.includes(duration)
        ? duration
        : event.data.length;

      const bookingInput = {
        values,
        duration: validDuration,
        event: event.data,
        date: timeslot,
        timeZone: timezone,
        language: i18n.language,
        rescheduleUid: rescheduleUid || undefined,
        bookingUid: (bookingData && bookingData.uid) || seatedEventData?.bookingUid || undefined,
        username: username || "",
        metadata: Object.keys(routerQuery)
          .filter((key) => key.startsWith("metadata"))
          .reduce(
            (metadata, key) => ({
              ...metadata,
              [key.substring("metadata[".length, key.length - 1)]: searchParams?.get(key),
            }),
            {}
          ),
        hashedLink,
      };

      if (isInstantMeeting) {
        createInstantBookingMutation.mutate(mapBookingToMutationInput(bookingInput));
      } else if (event.data?.recurringEvent?.freq && recurringEventCount && !rescheduleUid) {
        createRecurringBookingMutation.mutate(
          mapRecurringBookingToMutationInput(bookingInput, recurringEventCount)
        );
      } else {
        createBookingMutation.mutate(mapBookingToMutationInput(bookingInput));
      }
      // Clears form values stored in store, so old values won't stick around.
      setFormValues({});
      bookingForm.clearErrors();
    }
  };

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
    creatingBooking: createBookingMutation.isLoading || createBookingMutation.isSuccess,
    creatingRecurringBooking:
      createRecurringBookingMutation.isLoading || createRecurringBookingMutation.isSuccess,
    creatingInstantBooking: createInstantBookingMutation.isLoading,
  };

  return {
    handleBookEvent,
    expiryTime,
    bookingForm,
    bookerFormErrorRef,
    errors,
    loadingStates,
    hasInstantMeetingTokenExpired: Boolean(hasInstantMeetingTokenExpired),
  };
};
