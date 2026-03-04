import { UserRepository } from '@calcom/features/users/repositories/UserRepository';
import { BookingRepository } from '@calcom/features/bookings/repositories/BookingRepository';
import type { BusyTime, TimeSlot } from '@calcom/features/availability/types';

/**
 * Fetch busy times for any Cal.com user guests matching the given emails.
 * Excludes the booking being rescheduled so the original slot stays available.
 */
export async function getGuestBusyTimes(
  emails: string[],
  start: Date,
  end: Date,
  excludeBookingId: string,
): Promise<BusyTime[]> {
  const users = await new UserRepository().findByEmails(emails);
  if (users.length === 0) return [];
  const userIds = users.map((u) => u.id);
  const bookings = await new BookingRepository().findGuestBookings(
    userIds,
    excludeBookingId,
    start,
    end,
  );
  return bookings.flatMap((b) => b.busyTimes);
}

/**
 * Remove any slots that overlap with the provided busy intervals.
 */
export function filterSlotsByBusyTimes(
  slots: TimeSlot[],
  busyTimes: BusyTime[],
): TimeSlot[] {
  return slots.filter((slot) =>
    !busyTimes.some((busy) =>
      slot.start < busy.end && slot.end > busy.start,
    ),
  );
}