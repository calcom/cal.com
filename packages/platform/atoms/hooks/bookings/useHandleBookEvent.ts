import type { UseBookingFormReturnType } from "@calcom/features/bookings/Booker/components/hooks/useBookingForm";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import { setLastBookingResponse } from "@calcom/features/bookings/Booker/utils/lastBookingResponse";
import {
  useTimePreferences,
  mapBookingToMutationInput,
  mapRecurringBookingToMutationInput,
} from "@calcom/features/bookings/lib";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { BookingCreateBody } from "@calcom/prisma/zod-utils";

import type { UseCreateBookingInput } from "./useCreateBooking";

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
  handleBooking: (input: UseCreateBookingInput) => void;
  handleInstantBooking: (input: BookingCreateBody) => void;
  handleRecBooking: (input: BookingCreateBody[]) => void;
  locationUrl?: string;
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
}: UseHandleBookingProps) => {
  const setFormValues = useBookerStore((state) => state.setFormValues);
  const timeslot = useBookerStore((state) => state.selectedTimeslot);
  const duration = useBookerStore((state) => state.selectedDuration);
  const { timezone } = useTimePreferences();
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
      };

      if (isInstantMeeting) {
        handleInstantBooking(mapBookingToMutationInput(bookingInput));
      } else if (event.data?.recurringEvent?.freq && recurringEventCount && !rescheduleUid) {
        handleRecBooking(mapRecurringBookingToMutationInput(bookingInput, recurringEventCount));
      } else {
        handleBooking({ ...mapBookingToMutationInput(bookingInput), locationUrl });
      }
      // Clears form values stored in store, so old values won't stick around.
      setFormValues({});
      bookingForm.clearErrors();
    }
  };

  return handleBookEvent;
};
