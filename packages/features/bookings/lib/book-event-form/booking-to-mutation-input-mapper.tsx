import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import { getRoutedTeamMemberIdsFromSearchParams } from "@calcom/lib/bookings/getRoutedTeamMemberIdsFromSearchParams";
import { fromEntriesWithDuplicateKeys } from "@calcom/lib/fromEntriesWithDuplicateKeys";
import { parseRecurringDates } from "@calcom/lib/parse-dates";

import type { BookerEvent, BookingCreateBody, RecurringBookingCreateBody } from "../../types";

export type BookingOptions = {
  values: Record<string, unknown>;
  event: Pick<BookerEvent, "id" | "length" | "slug" | "schedulingType" | "recurringEvent">;
  date: string;
  // @NOTE: duration is not validated in this function
  duration: number | undefined | null;
  timeZone: string;
  language: string;
  rescheduleUid: string | undefined;
  rescheduledBy: string | undefined;
  username: string;
  metadata?: Record<string, string>;
  bookingUid?: string;
  seatReferenceUid?: string;
  hashedLink?: string | null;
  teamMemberEmail?: string | null;
  orgSlug?: string;
};

function getRoutingFormResponsesFromSearchParams(searchParams: URLSearchParams) {
  const allSearchParams = fromEntriesWithDuplicateKeys(searchParams.entries());

  function onlyRoutingFormResponses([key, _value]: [string, string | string[]]) {
    // Routing Form responses are currently passed without cal. prefix
    if (key.startsWith("cal.")) {
      return false;
    }
    const queryParamsUsedByBookingForm = ["date", "month", "slot"];
    return !queryParamsUsedByBookingForm.includes(key);
  }

  const routingFormResponsesWithOnlyStringValues = Object.fromEntries(
    Object.entries(allSearchParams)
      .filter(onlyRoutingFormResponses)
      .map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value])
  );

  return routingFormResponsesWithOnlyStringValues;
}

export const mapBookingToMutationInput = ({
  values,
  event,
  date,
  duration,
  timeZone,
  language,
  rescheduleUid,
  rescheduledBy,
  username,
  metadata,
  bookingUid,
  seatReferenceUid,
  hashedLink,
  teamMemberEmail,
  orgSlug,
}: BookingOptions): BookingCreateBody => {
  const searchParams = new URLSearchParams(window.location.search);
  const routedTeamMemberIds = getRoutedTeamMemberIdsFromSearchParams(searchParams);
  const routingFormResponseIdParam = searchParams.get("cal.routingFormResponseId");
  const routingFormResponseId = routingFormResponseIdParam ? Number(routingFormResponseIdParam) : undefined;
  const skipContactOwner = searchParams.get("cal.skipContactOwner") === "true";
  const routingFormResponses = getRoutingFormResponsesFromSearchParams(searchParams);
  const reroutingFormResponses = searchParams.get("cal.reroutingFormResponses");
  return {
    ...values,
    user: username,
    start: dayjs(date).format(),
    end: dayjs(date)
      // Defaults to the default event length in case no custom duration is set.
      .add(duration || event.length, "minute")
      .format(),
    eventTypeId: event.id,
    eventTypeSlug: event.slug,
    timeZone: timeZone,
    language: language,
    rescheduleUid,
    rescheduledBy,
    metadata: metadata || {},
    hasHashedBookingLink: hashedLink ? true : false,
    bookingUid,
    seatReferenceUid,
    hashedLink,
    teamMemberEmail,
    orgSlug,
    routedTeamMemberIds,
    routingFormResponseId,
    skipContactOwner,
    // TODO: We can retrieve it in handleNewBooking from routingFormResponseId. But it needs some transformation first, so let's do it later
    routingFormResponses,
    // In case of rerouting, the form responses are actually the responses that we need to update.
    reroutingFormResponses: reroutingFormResponses ? JSON.parse(reroutingFormResponses) : undefined,
  };
};

// This method is here to ensure that the types are correct (recurring count is required),
// as well as generate a unique ID for the recurring bookings and turn one single booking
// into an array of mutiple bookings based on the recurring count.
// Other than that it forwards the mapping to mapBookingToMutationInput.
export const mapRecurringBookingToMutationInput = (
  booking: BookingOptions,
  recurringCount: number
): RecurringBookingCreateBody[] => {
  const recurringEventId = uuidv4();
  const [, recurringDates] = parseRecurringDates(
    {
      startDate: booking.date,
      timeZone: booking.timeZone,
      recurringEvent: booking.event.recurringEvent,
      recurringCount,
      withDefaultTimeFormat: true,
    },
    booking.language
  );

  const input = mapBookingToMutationInput({ ...booking, bookingUid: undefined });

  return recurringDates.map((recurringDate) => ({
    ...input,
    start: dayjs(recurringDate).format(),
    end: dayjs(recurringDate)
      .add(booking.duration || booking.event.length, "minute")
      .format(),
    recurringEventId,
    schedulingType: booking.event.schedulingType || undefined,
    recurringCount: recurringDates.length,
  }));
};
