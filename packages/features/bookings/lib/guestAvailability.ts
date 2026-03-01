/**
 * Guest Availability Service for Rescheduling
 * 
 * When a host reschedules, check guest availability and filter available slots.
 */
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";

const bookingRepo = new BookingRepository();
const userRepo = new UserRepository();

/**
 * Guest user information
 */
export interface GuestInfo {
  email: string;
  id?: number;
}

/**
 * Get guest users who are Cal.com users from booking attendees
 */
export async function getGuestUsersForReschedule(rescheduleUid: string): Promise<GuestInfo[]> {
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
  const users = await userRepo.findUsersByEmailsForAvailability(guestEmails);

  return users.map(user => ({
    email: user.email,
    id: user.id,
  }));
}

/**
 * Busy time slot for a guest
 */
export interface GuestBusyTime {
  start: Date;
  end: Date;
  title: string;
}

/**
 * Check if any guest has conflicting bookings in the time window
 */
export async function getGuestBusyTimes(
  rescheduleUid: string,
  startDate: Date,
  endDate: Date
): Promise<GuestBusyTime[]> {
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

/**
 * Filter available slots based on guest availability
 */
export async function filterSlotsByGuestAvailability(
  rescheduleUid: string,
  availableSlots: { start: Date; end: Date }[]
): Promise<{ start: Date; end: Date }[]> {
  if (availableSlots.length === 0) {
    return [];
  }

  const startTime = availableSlots[0].start;
  const endTime = availableSlots[availableSlots.length - 1].end;

  const guestBusyTimes = await getGuestBusyTimes(rescheduleUid, startTime, endTime);

  if (guestBusyTimes.length === 0) {
    return availableSlots;
  }

  // Filter out slots that conflict with guest busy times
  return availableSlots.filter(slot => {
    return !guestBusyTimes.some(busy => {
      return slot.start < busy.end && slot.end > busy.start;
    });
  });
}
