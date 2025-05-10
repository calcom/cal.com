import { countBy } from "lodash";
import { v4 as uuid } from "uuid";

import dayjs from "@calcom/dayjs";
import type { CurrentSeats } from "@calcom/lib/getUserAvailability";

import type { SelectedSlots } from "./ReservedSlotHandler";

export class SeatProcessor {
  /**
   * Processes occupied seats and updates currentSeats
   */
  public processSeats({
    reservedSlots,
    eventTypeId,
    currentSeats,
  }: {
    reservedSlots: SelectedSlots[];
    eventTypeId: number;
    currentSeats: CurrentSeats | undefined;
  }): {
    currentSeats: CurrentSeats;
    occupiedSeats: SelectedSlots[];
  } {
    let processedCurrentSeats = currentSeats || [];

    let occupiedSeats: SelectedSlots[] = reservedSlots.filter(
      (item) => item.isSeat && item.eventTypeId === eventTypeId
    );

    if (occupiedSeats?.length) {
      const addedToCurrentSeats: string[] = [];

      if (typeof processedCurrentSeats !== "undefined") {
        processedCurrentSeats = processedCurrentSeats.map((item) => {
          const attendees =
            occupiedSeats.filter(
              (seat) => seat.slotUtcStartDate.toISOString() === item.startTime.toISOString()
            )?.length || 0;

          if (attendees) addedToCurrentSeats.push(item.startTime.toISOString());

          return {
            ...item,
            _count: {
              attendees: item._count.attendees + attendees,
            },
          };
        });

        occupiedSeats = occupiedSeats.filter(
          (item) => !addedToCurrentSeats.includes(item.slotUtcStartDate.toISOString())
        );
      }

      processedCurrentSeats = this.applyOccupiedSeatsToCurrentSeats(
        processedCurrentSeats || [],
        occupiedSeats
      );
    }

    return { currentSeats: processedCurrentSeats, occupiedSeats };
  }

  /**
   * Applies occupied seats to current seats
   */
  private applyOccupiedSeatsToCurrentSeats(
    currentSeats: CurrentSeats,
    occupiedSeats: SelectedSlots[]
  ): CurrentSeats {
    const occupiedSeatsCount = countBy(occupiedSeats, (item) => item.slotUtcStartDate.toISOString());

    Object.keys(occupiedSeatsCount).forEach((date) => {
      currentSeats.push({
        uid: uuid(),
        startTime: dayjs(date).toDate(),
        _count: { attendees: occupiedSeatsCount[date] },
      });
    });

    return currentSeats;
  }
}
