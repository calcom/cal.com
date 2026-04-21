export function isWithinMinimumCancellationNotice(
  bookingStartTime: Date | null,
  cancellationNoticeHours: number | null
): boolean {
  if (!cancellationNoticeHours || cancellationNoticeHours <= 0 || !bookingStartTime) {
    return false;
  }

  const now = new Date();
  const bookingStart = new Date(bookingStartTime);
  const timeUntilBooking = bookingStart.getTime() - now.getTime();
  const cancellationNoticeMs = cancellationNoticeHours * 60 * 60 * 1000;

  return timeUntilBooking > 0 && timeUntilBooking < cancellationNoticeMs;
}
