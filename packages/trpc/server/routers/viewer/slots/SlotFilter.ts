import type { Dayjs } from "@calcom/dayjs";
import { checkForConflicts } from "@calcom/features/bookings/lib/conflictChecker/checkForConflicts";
import type { CurrentSeats } from "@calcom/lib/getUserAvailability";
import type { EventBusyDate } from "@calcom/types/Calendar";

import type { SelectedSlots } from "./ReservedSlotHandler";

export class SlotFilter {
  /**
   * Filters available time slots based on reserved slots
   */
  public filterAvailableTimeSlots({
    availableTimeSlots,
    reservedSlots,
    eventLength,
    currentSeats,
  }: {
    availableTimeSlots: {
      time: Dayjs;
      userIds?: number[];
    }[];
    reservedSlots: SelectedSlots[];
    eventLength: number;
    currentSeats: CurrentSeats | undefined;
  }): {
    time: Dayjs;
    userIds?: number[];
  }[] {
    if (reservedSlots.length === 0) {
      return availableTimeSlots;
    }

    const availabilityCheckProps = {
      eventLength,
      currentSeats,
    };

    return availableTimeSlots
      .map((slot) => {
        const busySlotsFromReservedSlots = reservedSlots.reduce<EventBusyDate[]>((r, c) => {
          if (!c.isSeat) {
            r.push({ start: c.slotUtcStartDate, end: c.slotUtcEndDate });
          }
          return r;
        }, []);

        if (
          !checkForConflicts({
            time: slot.time,
            busy: busySlotsFromReservedSlots,
            ...availabilityCheckProps,
          })
        ) {
          return slot;
        }
        return undefined;
      })
      .filter(
        (
          item:
            | {
                time: Dayjs;
                userIds?: number[] | undefined;
              }
            | undefined
        ): item is {
          time: Dayjs;
          userIds?: number[] | undefined;
        } => {
          return !!item;
        }
      );
  }
}
