export function isWithinMinimumRescheduleNotice(
  bookingStartTime: Date | null,
  minimumRescheduleNotice: number | null
): boolean {
  if (!minimumRescheduleNotice || minimumRescheduleNotice <= 0 || !bookingStartTime) {
    return false;
  }

  const now = new Date();
  const bookingStart = new Date(bookingStartTime);
  const timeUntilBooking = bookingStart.getTime() - now.getTime();
  const minimumRescheduleNoticeMs = minimumRescheduleNotice * 60 * 1000;

  // Return true if we're within the minimum notice period (but booking hasn't started yet)
  return timeUntilBooking > 0 && timeUntilBooking < minimumRescheduleNoticeMs;
}
