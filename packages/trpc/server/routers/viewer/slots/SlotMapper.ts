import type { Dayjs } from "@calcom/dayjs";
import type { CurrentSeats } from "@calcom/lib/getUserAvailability";

export class SlotMapper {
  /**
   * Maps available time slots to dates
   */
  public mapSlotsToDate({
    availableTimeSlots,
    currentSeats,
    timeZone,
    onlyShowFirstAvailableSlot,
  }: {
    availableTimeSlots: {
      time: Dayjs;
      userIds?: number[];
    }[];
    currentSeats: CurrentSeats | undefined;
    timeZone: string;
    onlyShowFirstAvailableSlot: boolean;
  }): Record<string, { time: string; attendees?: number; bookingUid?: string }[]> {
    const formatter = new Intl.DateTimeFormat("fr-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    });

    return availableTimeSlots.reduce(
      (
        r: Record<string, { time: string; attendees?: number; bookingUid?: string }[]>,
        { time, ...passThroughProps }
      ) => {
        const dateString = formatter.format(time.toDate());

        r[dateString] = r[dateString] || [];
        if (onlyShowFirstAvailableSlot && r[dateString].length > 0) {
          return r;
        }
        r[dateString].push({
          ...passThroughProps,
          time: time.toISOString(),
          ...(currentSeats?.some((booking) => booking.startTime.toISOString() === time.toISOString()) && {
            attendees:
              currentSeats[
                currentSeats.findIndex((booking) => booking.startTime.toISOString() === time.toISOString())
              ]._count.attendees,
            bookingUid:
              currentSeats[
                currentSeats.findIndex((booking) => booking.startTime.toISOString() === time.toISOString())
              ].uid,
          }),
        });
        return r;
      },
      Object.create(null)
    );
  }
}
