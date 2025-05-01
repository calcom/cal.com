// Basic ISO format validation using string checks
// Without RegExp check, to keep it fast and simple
export const isValidISOFormat = (dateStr: string) => {
  if (dateStr.length < 16) return false;

  // Check for required separators
  return dateStr[4] === "-" && dateStr[7] === "-" && dateStr[10] === "T" && dateStr[13] === ":";
};

/**
 * Compares two time slots for equality, optionally ignoring seconds
 * @param slotTimeInIso - The available time slot to check
 * @param slotToCheckInIso - The slot to compare against
 * @returns boolean indicating if the slots match
 */
export const isSlotEquivalent = ({
  slotTimeInIso,
  slotToCheckInIso,
}: {
  slotTimeInIso: string;
  slotToCheckInIso: string;
}): boolean => {
  // String comparison is faster than date comparison. So, compare string equality first
  if (slotTimeInIso === slotToCheckInIso) {
    return true;
  }

  if (!isValidISOFormat(slotTimeInIso) || !isValidISOFormat(slotToCheckInIso)) {
    console.log("Invalid ISO string format detected", { slotTimeInIso, slotToCheckInIso });
    // Consider slots equivalent
    return true;
  }

  // We ignore seconds and see if the minutes match
  // For very short duration slots, we seem to have some bug that creates timeslots with seconds in them which isn't normally the case
  // Till, we handle that, we ignore seconds explicitly. It could be better to have this even after that.
  // It allows "confirm" button to be not disabled in such case.
  // Actual booking confirmation, can still reject the booking if we allow a non-bookable slot to be considered available here.
  // 2025-02-08T14:23:45Z -> 2025-02-08T14:23
  const availableSlotIgnoringSeconds = slotTimeInIso.slice(0, 16);
  const slotToCheckIgnoringSeconds = slotToCheckInIso.slice(0, 16);
  return availableSlotIgnoringSeconds === slotToCheckIgnoringSeconds;
};
