import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import { isBookingDryRun } from "@calcom/features/bookings/Booker/utils/isBookingDryRun";
import { getRoutedTeamMemberIdsFromSearchParams } from "@calcom/lib/bookings/getRoutedTeamMemberIdsFromSearchParams";
import { parseRecurringDates } from "@calcom/lib/parse-dates";
import type { RoutingFormSearchParams } from "@calcom/platform-types";

import type { BookerEvent, BookingCreateBody, RecurringBookingCreateBody } from "../../../types";
import type { Tracking } from "../../handleNewBooking/types";

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
  crmOwnerRecordType?: string | null;
  crmAppSlug?: string | null;
  crmRecordId?: string | null;
  orgSlug?: string;
  routingFormSearchParams?: RoutingFormSearchParams;
  isDryRunProp?: boolean;
  verificationCode?: string;
};

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
  crmOwnerRecordType,
  crmAppSlug,
  crmRecordId,
  orgSlug,
  routingFormSearchParams,
  isDryRunProp,
  verificationCode,
}: BookingOptions): BookingCreateBody => {
  const searchParams = new URLSearchParams(routingFormSearchParams ?? window.location.search);
  const routedTeamMemberIds = getRoutedTeamMemberIdsFromSearchParams(searchParams);
  const routingFormResponseIdParam = searchParams.get("cal.routingFormResponseId");
  const routingFormResponseId = routingFormResponseIdParam ? Number(routingFormResponseIdParam) : undefined;
  const skipContactOwner = searchParams.get("cal.skipContactOwner") === "true";
  const reroutingFormResponses = searchParams.get("cal.reroutingFormResponses");
  const _isDryRun = isDryRunProp !== undefined ? isDryRunProp : isBookingDryRun(searchParams);
  const dub_id = searchParams?.get("dub_id");

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
    crmOwnerRecordType,
    crmAppSlug,
    crmRecordId,
    orgSlug,
    routedTeamMemberIds,
    routingFormResponseId,
    skipContactOwner,
    // In case of rerouting, the form responses are actually the responses that we need to update.
    reroutingFormResponses: reroutingFormResponses ? JSON.parse(reroutingFormResponses) : undefined,
    _isDryRun,
    dub_id,
    verificationCode,
  };
};

// This method is here to ensure that the types are correct (recurring count is required),
// as well as generate a unique ID for the recurring bookings and turn one single booking
// into an array of multiple bookings based on the recurring count.
// Other than that it forwards the mapping to mapBookingToMutationInput.
export const mapRecurringBookingToMutationInput = (
  booking: BookingOptions,
  recurringCount: number,
  tracking?: Tracking
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
    tracking,
  }));
};
