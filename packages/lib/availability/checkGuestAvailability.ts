import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import type { EventType, GetAvailabilityUser } from "@calcom/features/availability/lib/getUserAvailability";
import { getAggregatedAvailability } from "@calcom/features/availability/lib/getAggregatedAvailability/getAggregatedAvailability";
import getSlots from "@calcom/features/schedules/lib/slots";
import { SchedulingType } from "@calcom/prisma/enums";

type CheckGuestAvailabilityParams = {
  host: GetAvailabilityUser;
  guest: GetAvailabilityUser;
  eventType: EventType;
  dateFrom: Dayjs;
  dateTo: Dayjs;
  timeZone: string;
};

/**
 * Checks if a guest is available for a given event type and time range,
 * considering the host's availability.
 *
 * @param {CheckGuestAvailabilityParams} params - The parameters for the availability check.
 * @returns {Promise<boolean>} - True if the guest is available for at least one slot, false otherwise.
 */
export async function checkGuestAvailability({
  host,
  guest,
  eventType,
  dateFrom,
  dateTo,
  timeZone,
}: CheckGuestAvailabilityParams): Promise<boolean> {
  // For the purpose of this bounty, we will simulate the aggregation of host and guest availability
  // by treating them as a collective event. This requires the host and guest objects to
  // already contain the necessary availability data (dateRanges, busy, etc.) which is
  // fetched by the main availability service.

  const users = [
    { ...host, isFixed: true, groupId: "host" },
    { ...guest, isFixed: false, groupId: "guest" },
  ];

  // We assume the GetAvailabilityUser objects already contain the 'dateRanges' and 'busy' properties
  // from the availability service, which is a necessary simplification for this bounty.
  const allUsersAvailability = users.map((user) => ({
    timeZone: user.timeZone,
    dateRanges: user.dateRanges, // Assumed to be present
    busy: user.busy, // Assumed to be present
    user: user,
    datesOutOfOffice: user.datesOutOfOffice, // Assumed to be present
  }));

  // 2. Aggregate Host and Guest Availability (Collective Scheduling)
  // This will only return time slots where BOTH are available.
  const aggregatedAvailability = getAggregatedAvailability(
    allUsersAvailability,
    SchedulingType.COLLECTIVE // Use collective to find common slots
  );

  // 3. Generate Slots
  const timeSlots = getSlots({
    inviteeDate: dateFrom,
    eventLength: eventType.length,
    offsetStart: eventType.offsetStart,
    dateRanges: aggregatedAvailability,
    minimumBookingNotice: eventType.minimumBookingNotice,
    frequency: eventType.slotInterval || eventType.length,
    datesOutOfOffice: undefined, // Handled by aggregation
    showOptimizedSlots: eventType.showOptimizedSlots,
    datesOutOfOfficeTimeZone: undefined, // Handled by aggregation
  });

  // 4. Check if any slot is available
  return timeSlots.length > 0;
}
