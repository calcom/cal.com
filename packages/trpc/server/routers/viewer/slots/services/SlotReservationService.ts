import dayjs from "@calcom/dayjs";
import type { GetAvailabilityUser } from "@calcom/features/availability/lib/getUserAvailability";
import type { ISelectedSlotRepository } from "@calcom/features/selectedSlots/repositories/ISelectedSlotRepository";

/**
 * Service responsible for managing reserved/selected slots.
 * Handles slot reservations and cleanup of expired slots.
 */
export class SlotReservationService {
  constructor(private readonly selectedSlotRepo: ISelectedSlotRepository) {}

  /**
   * Gets reserved slots for users and cleans up expired slots.
   * Returns slots that have been selected by other users (not the current booker).
   */
  async getReservedSlotsAndCleanupExpired({
    bookerClientUid,
    usersWithCredentials,
    eventTypeId,
  }: {
    bookerClientUid: string | undefined;
    usersWithCredentials: GetAvailabilityUser[];
    eventTypeId: number;
  }) {
    const currentTimeInUtc = dayjs.utc().format();

    const unexpiredSelectedSlots =
      (await this.selectedSlotRepo.findManyUnexpiredSlots({
        userIds: usersWithCredentials.map((user) => user.id),
        currentTimeInUtc,
      })) || [];

    const slotsSelectedByOtherUsers = unexpiredSelectedSlots.filter((slot) => slot.uid !== bookerClientUid);

    await this._cleanupExpiredSlots({ eventTypeId, currentTimeInUtc });

    return slotsSelectedByOtherUsers;
  }

  private async _cleanupExpiredSlots({
    eventTypeId,
    currentTimeInUtc,
  }: {
    eventTypeId: number;
    currentTimeInUtc: string;
  }) {
    await this.selectedSlotRepo.deleteManyExpiredSlots({ eventTypeId, currentTimeInUtc });
  }
}
