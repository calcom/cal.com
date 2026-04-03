import type dayjs from "@calcom/dayjs";

export type GuestBusyInterval = { startTime: Date; endTime: Date };

/**
 * Filters available time slots by removing any that overlap with a guest user's
 * existing bookings. Uses a half-open interval comparison:
 *   conflict iff slotStart < bookingEnd && slotEnd > bookingStart
 *
 * @param slots             - Array of candidate time slots
 * @param eventLengthMinutes - Duration of the event in minutes
 * @param guestBusyBookings  - Busy intervals for guest Cal.com users
 * @returns Slots that do not conflict with any guest busy interval
 */
export function filterSlotsForGuestBusyTimes(
  slots: Array<{ time: dayjs.Dayjs }>,
  eventLengthMinutes: number,
  guestBusyBookings: GuestBusyInterval[]
): Array<{ time: dayjs.Dayjs }> {
  if (guestBusyBookings.length === 0) return slots;
  return slots.filter((slot) => {
    const slotStart = slot.time.valueOf();
    const slotEnd = slotStart + eventLengthMinutes * 60 * 1000;
    return !guestBusyBookings.some((booking) => {
      const bookingStart = new Date(booking.startTime).valueOf();
      const bookingEnd = new Date(booking.endTime).valueOf();
      return slotStart < bookingEnd && slotEnd > bookingStart;
    });
  });
}
