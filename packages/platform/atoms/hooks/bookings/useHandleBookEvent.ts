import { useSearchParams } from "next/navigation";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useBookerTime } from "@calcom/features/bookings/Booker/components/hooks/useBookerTime";
import type { UseBookingFormReturnType } from "@calcom/features/bookings/Booker/components/hooks/useBookingForm";
import { mapBookingToMutationInput, mapRecurringBookingToMutationInput } from "@calcom/features/bookings/lib";
import type { BookingCreateBody } from "@calcom/features/bookings/lib/bookingCreateBodySchema";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RoutingFormSearchParams } from "@calcom/platform-types";
import { showToast } from "@calcom/ui/components/toast";

import { getUtmTrackingParameters } from "../../lib/getUtmTrackingParameters";
import type { UseCreateBookingInput } from "./useCreateBooking";

type Callbacks = { onSuccess?: () => void; onError?: (err: unknown) => void };
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
  isBookingDryRun?: boolean;
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
  isBookingDryRun,
}: UseHandleBookingProps) => {
  const isPlatform = useIsPlatform();
  const setFormValues = useBookerStoreContext((state) => state.setFormValues);
  const storeTimeSlot = useBookerStoreContext((state) => state.selectedTimeslot);
  const duration = useBookerStoreContext((state) => state.selectedDuration);
  const { timezone } = useBookerTime();
  const rescheduleUid = useBookerStoreContext((state) => state.rescheduleUid);
  const rescheduledBy = useBookerStoreContext((state) => state.rescheduledBy);
  const { t, i18n } = useLocale();
  const username = useBookerStoreContext((state) => state.username);
  const recurringEventCount = useBookerStoreContext((state) => state.recurringEventCount);
  const bookingData = useBookerStoreContext((state) => state.bookingData);
  const seatedEventData = useBookerStoreContext((state) => state.seatedEventData);
  const isInstantMeeting = useBookerStoreContext((state) => state.isInstantMeeting);
  const orgSlug = useBookerStoreContext((state) => state.org);
  const teamMemberEmail = useBookerStoreContext((state) => state.teamMemberEmail);
  const crmOwnerRecordType = useBookerStoreContext((state) => state.crmOwnerRecordType);
  const crmAppSlug = useBookerStoreContext((state) => state.crmAppSlug);
  const crmRecordId = useBookerStoreContext((state) => state.crmRecordId);
  const verificationCode = useBookerStoreContext((state) => state.verificationCode);
  const handleError = (err: unknown) => {
    const errorMessage = err instanceof Error ? t(err.message) : t("can_you_try_again");
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
        crmRecordId,
        orgSlug: orgSlug ? orgSlug : undefined,
        routingFormSearchParams,
        isDryRunProp: isBookingDryRun,
        verificationCode: verificationCode || undefined,
      };

      const tracking = getUtmTrackingParameters(searchParams);

      if (isInstantMeeting) {
        handleInstantBooking(mapBookingToMutationInput(bookingInput), callbacks);
      } else if (event.data?.recurringEvent?.freq != null && recurringEventCount && !rescheduleUid) {
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
