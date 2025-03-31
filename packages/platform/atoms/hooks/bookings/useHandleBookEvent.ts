import { useSearchParams } from "next/navigation";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import { useBookerTime } from "@calcom/features/bookings/Booker/components/hooks/useBookerTime";
import type { UseBookingFormReturnType } from "@calcom/features/bookings/Booker/components/hooks/useBookingForm";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import { setLastBookingResponse } from "@calcom/features/bookings/Booker/utils/lastBookingResponse";
import { mapBookingToMutationInput, mapRecurringBookingToMutationInput } from "@calcom/features/bookings/lib";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RoutingFormSearchParams } from "@calcom/platform-types";
import type { BookingCreateBody } from "@calcom/prisma/zod/custom/booking";
import { showToast } from "@calcom/ui/components/toast";

import { getUtmTrackingParameters } from "../../lib/getUtmTrackingParameters";
import type { UseCreateBookingInput } from "./useCreateBooking";

type Callbacks = { onSuccess?: () => void; onError?: (err: any) => void };
type UseHandleBookingProps = {
  bookingForm: UseBookingFormReturnType["bookingForm"];
  event?: {
    data?: Pick<
      BookerEvent,
      "id" | "isDynamic" | "metadata" | "recurringEvent" | "length" | "slug" | "schedulingType"
    > | null;
  };
  metadata: Record<string, string>;
  hashedLink?: string | null;
  handleBooking: (input: UseCreateBookingInput, callbacks?: Callbacks) => void;
  handleInstantBooking: (input: BookingCreateBody, callbacks?: Callbacks) => void;
  handleRecBooking: (input: BookingCreateBody[], callbacks?: Callbacks) => void;
  locationUrl?: string;
  routingFormSearchParams?: RoutingFormSearchParams;
};

export const useHandleBookEvent = ({
  bookingForm,
  event,
  metadata,
  hashedLink,
  handleBooking,
  handleInstantBooking,
  handleRecBooking,
  locationUrl,
  routingFormSearchParams,
}: UseHandleBookingProps) => {
  const isPlatform = useIsPlatform();
  const setFormValues = useBookerStore((state) => state.setFormValues);
  const storeTimeSlot = useBookerStore((state) => state.selectedTimeslot);
  const duration = useBookerStore((state) => state.selectedDuration);
  const { timezone } = useBookerTime();
  const rescheduleUid = useBookerStore((state) => state.rescheduleUid);
  const rescheduledBy = useBookerStore((state) => state.rescheduledBy);
  const { t, i18n } = useLocale();
  const username = useBookerStore((state) => state.username);
  const recurringEventCount = useBookerStore((state) => state.recurringEventCount);
  const bookingData = useBookerStore((state) => state.bookingData);
  const seatedEventData = useBookerStore((state) => state.seatedEventData);
  const isInstantMeeting = useBookerStore((state) => state.isInstantMeeting);
  const orgSlug = useBookerStore((state) => state.org);
  const teamMemberEmail = useBookerStore((state) => state.teamMemberEmail);
  const crmOwnerRecordType = useBookerStore((state) => state.crmOwnerRecordType);
  const crmAppSlug = useBookerStore((state) => state.crmAppSlug);
  const handleError = (err: any) => {
    const errorMessage = err?.message ? t(err.message) : t("can_you_try_again");
    showToast(errorMessage, "error");
  };
  const searchParams = useSearchParams();

  const handleBookEvent = (inputTimeSlot?: string) => {
    const values = bookingForm.getValues();
    const timeslot = inputTimeSlot ?? storeTimeSlot;
    const callbacks = inputTimeSlot && !isPlatform ? { onError: handleError } : undefined;
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

      setLastBookingResponse(values.responses);

      const bookingInput = {
        values,
        duration: validDuration,
        event: event.data,
        date: timeslot,
        timeZone: timezone,
        language: i18n.language,
        rescheduleUid: rescheduleUid || undefined,
        rescheduledBy: rescheduledBy || undefined,
        bookingUid: (bookingData && bookingData.uid) || seatedEventData?.bookingUid || undefined,
        username: username || "",
        metadata: metadata,
        hashedLink,
        teamMemberEmail,
        crmOwnerRecordType,
        crmAppSlug,
        orgSlug: orgSlug ? orgSlug : undefined,
        routingFormSearchParams,
      };

      const tracking = getUtmTrackingParameters(searchParams);

      if (isInstantMeeting) {
        handleInstantBooking(mapBookingToMutationInput(bookingInput), callbacks);
      } else if (event.data?.recurringEvent?.freq && recurringEventCount && !rescheduleUid) {
        handleRecBooking(
          mapRecurringBookingToMutationInput(bookingInput, recurringEventCount, tracking),
          callbacks
        );
      } else {
        handleBooking({ ...mapBookingToMutationInput(bookingInput), locationUrl, tracking }, callbacks);
      }
      // Clears form values stored in store, so old values won't stick around.
      setFormValues({});
      bookingForm.clearErrors();
    }
  };

  return handleBookEvent;
};
