/**
 * Guest Availability Service for Rescheduling
 * 
 * When a host reschedules, check guest availability and filter slots.
 */
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";

const bookingRepo = new BookingRepository();
const userRepo = new UserRepository();

/**
 * Get guest users who are Cal.com users from booking attendees
 */
export async function getGuestUsersForReschedule(rescheduleUid: string): Promise<{
  email: string;
  id: number;
}[]> {
  const booking = await bookingRepo.findByUidIncludeEventTypeAttendeesAndUser({
    bookingUid: rescheduleUid,
  });

  if (!booking || !booking.attendees) {
    return [];
  }

  // Get host emails to exclude
  const hostEmails = new Set<string>();
  if (booking.user?.email) {
    hostEmails.add(booking.user.email.toLowerCase());
  }
  if (booking.userPrimaryEmail) {
    hostEmails.add(booking.userPrimaryEmail.toLowerCase());
  }

  // Filter to only guest (non-host) emails
  const guestEmails = booking.attendees
    .map(a => a.email)
    .filter(email => !hostEmails.has(email.toLowerCase()));

  if (guestEmails.length === 0) {
    return [];
  }

  // Find which guests are registered Cal.com users
  const guests = await userRepo.findUsersByEmailsForAvailability(guestEmails);

  return guests.map(user => ({
    email: user.email,
    id: user.id,
  }));
}

/**
 * Check if any guest has conflicting bookings in the time window
 */
export async function getGuestBusyTimes(
  rescheduleUid: string,
  startDate: Date,
  endDate: Date
): Promise<{ start: Date; end: Date; title: string }[]> {
  const guests = await getGuestUsersForReschedule(rescheduleUid);
  
  if (guests.length === 0) {
    return [];
  }

  const guestEmails = guests.map(g => g.email);

  // Get accepted bookings for these guest users
  const bookings = await bookingRepo.getAcceptedBookingsByAttendeeEmails({
    emails: guestEmails,
    startDate,
    endDate,
    excludedUid: rescheduleUid,
  });

  return bookings.map(b => ({
    start: b.startTime,
    end: b.endTime,
    title: b.title || "Guest Booking",
  }));
}
