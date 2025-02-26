import type { QuickAvailabilityCheck } from "../components/hooks/useSlots";
import { isSlotEquivalent, isValidISOFormat } from "./isSlotEquivalent";

/**
 * Checks if a given time slot is available in the schedule
 * It should never give false negative, false positives are fine.
 * It could be unavailable for any number of reasons including the slot being reserved and not actually booked
 * @returns boolean - true if the slot is available, false otherwise.
 */
export const isTimeSlotAvailable = ({
  scheduleData,
  slotToCheckInIso,
  quickAvailabilityChecks,
}: {
  scheduleData: {
    slots: Record<string, { time: string }[]>;
  } | null;
  slotToCheckInIso: string;
  quickAvailabilityChecks: QuickAvailabilityCheck[];
}) => {
  const isUnavailableAsPerQuickCheck =
    quickAvailabilityChecks &&
    quickAvailabilityChecks.some(
      (slot) => slot.utcStartIso === slotToCheckInIso && slot.status !== "available"
    );

  if (isUnavailableAsPerQuickCheck) return false;

  // If schedule is not loaded or other variables are unavailable consider the slot available
  if (!scheduleData) {
    return true;
  }

  const dateInIso = isValidISOFormat(slotToCheckInIso) ? slotToCheckInIso.split("T")[0] : null;
  // If the date is not in ISO format, we could errorneously consider the slot unavailable, so be on the safe side and consider it available
  // Though this could be a false positive, it's better to consider the slot available than unavailable
  if (!dateInIso) return true;

  // Get the slots for this date
  const slotsForDateInIso = scheduleData.slots[dateInIso];
  if (!slotsForDateInIso) return false;

  // Check if the exact time slot exists in the available slots
  const matchFound = slotsForDateInIso.some((slot) => {
    return isSlotEquivalent({ slotTimeInIso: slot.time, slotToCheckInIso });
  });

  return matchFound;
};
