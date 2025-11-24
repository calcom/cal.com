import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import type { BookingResponse } from "@calcom/features/bookings/types";
import { SchedulingType } from "@calcom/prisma/client";

export type PlatformParams = {
  platformClientId?: string;
  platformCancelUrl?: string;
  platformBookingUrl?: string;
  platformRescheduleUrl?: string;
  platformBookingLocation?: string;
  areCalendarEventsEnabled?: boolean;
};

export type BookingHandlerInput = {
  bookingData: Record<string, any>[];
  userId?: number;
  // These used to come from headers but now we're passing them as params
  hostname?: string;
  forcedSlug?: string;
  noEmail?: boolean;
} & PlatformParams;

export const handleNewRecurringBooking = async (input: BookingHandlerInput): Promise<BookingResponse[]> => {
  const data = input.bookingData;

  /*
    Example bookingData structure:
    {
      responses: {...},
      user: 'arjun',
      start: '2025-10-19T20:00:00+05:30',
      end: '2025-10-19T20:15:00+05:30',
      eventTypeId: 3827,
      eventTypeSlug: 'test',
      timeZone: 'Asia/Calcutta',
      language: 'en',
      metadata: {},
      recurringEvent: { freq: 2, count: 10, interval: 10 }
    }
  */

  const createdBookings: BookingResponse[] = [];
  const firstBooking = Array.isArray(data) ? data[0] : data;
  const isRoundRobin = firstBooking.schedulingType === SchedulingType.ROUND_ROBIN;
  const isCollective = firstBooking.schedulingType === SchedulingType.COLLECTIVE;
  const isTeamEvent = isRoundRobin || isCollective;

  const handleBookingMeta = {
    userId: input.userId,
    platformClientId: input.platformClientId,
    platformRescheduleUrl: input.platformRescheduleUrl,
    platformCancelUrl: input.platformCancelUrl,
    platformBookingUrl: input.platformBookingUrl,
    platformBookingLocation: input.platformBookingLocation,
    areCalendarEventsEnabled: input.areCalendarEventsEnabled,
  };

  // For team recurring bookings, we create ONE booking with recurringEvent metadata
  // The system will expand instances from the metadata later
  // Assignment logic:
  // - COLLECTIVE: All team members assigned (handled by buildEventForTeamEventType in handleNewBooking)
  // - ROUND_ROBIN: One lucky user selected for entire series (handled by getLuckyUser in handleNewBooking)

  const bookingInfo = {
    ...firstBooking,
    // For team events, pass isRecurringTeamBooking flag to signal special handling
    isRecurringTeamBooking: isTeamEvent && !!firstBooking.recurringEvent,
    noEmail: input.noEmail !== undefined ? input.noEmail : false,
  };

  const bookingResult = await handleNewBooking({
    hostname: input.hostname || "",
    forcedSlug: input.forcedSlug as string | undefined,
    bookingData: bookingInfo,
    ...handleBookingMeta,
  });

  createdBookings.push(bookingResult);

  return createdBookings;
};
