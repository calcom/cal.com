import { PublicEvent } from "bookings/types";

import { getEventLocationValue } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";

import { BookingFormValues } from "../../components/BookEventForm/form-config";
import { BookingCreateBody } from "../create-booking";

export const mapBookingToMutationInput = (
  values: BookingFormValues,
  event: PublicEvent,
  date: string,
  // @NOTE: duration is not validated in this function
  duration: number,
  timeZone: string,
  language: string,
  customInputs: { label: string; value: string }[]
): BookingCreateBody => {
  return {
    ...values,
    start: dayjs(date).format(),
    end: dayjs(date).add(duration, "minute").format(),
    eventTypeId: event.id,
    eventTypeSlug: event.slug,
    timeZone,
    language,
    //@TODO:
    // rescheduleid
    location: getEventLocationValue(event.locations, {
      type: (values.locationType ? values.locationType : selectedLocationType) || "",
      phone: values.phone,
      attendeeAddress: values.attendeeAddress,
    }),
    // @TODO:
    //metadata,
    metadata: {},
    customInputs,
    hasHashedBookingLink: false,
    // hasHashedBookingLink,
    //     hashedLink,
    //     smsReminderNumber:
    //       selectedLocationType === LocationType.Phone
    //         ? booking.phone
    //         : booking.smsReminderNumber || undefined,
    //     ethSignature: gateState.rainbowToken,
    //     guests: booking.guests?.map((guest) => guest.email),
  };
};
