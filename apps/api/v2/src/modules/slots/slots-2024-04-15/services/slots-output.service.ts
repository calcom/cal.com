import { EventTypesRepository_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/event-types.repository";
import { Injectable, BadRequestException } from "@nestjs/common";
import { DateTime } from "luxon";

import { SlotFormat } from "@calcom/platform-enums";

export type TimeSlots = {
  slots: Record<string, { time: string; attendees?: number; bookingUid?: string }[]>;
};
export type RangeSlots = {
  slots: Record<string, { startTime: string; endTime: string; attendees?: number; bookingUid?: string }[]>;
};

@Injectable()
export class SlotsOutputService_2024_04_15 {
  constructor(private readonly eventTypesRepository: EventTypesRepository_2024_04_15) {}

  async getOutputSlots(
    availableSlots: TimeSlots,
    duration?: number,
    eventTypeId?: number,
    slotFormat?: SlotFormat,
    timeZone?: string
  ): Promise<TimeSlots | RangeSlots> {
    if (!slotFormat) {
      return timeZone ? this.setTimeZone(availableSlots, timeZone) : availableSlots;
    }

    const formattedSlots = await this.formatSlots(availableSlots, duration, eventTypeId, slotFormat);
    return timeZone ? this.setTimeZoneRange(formattedSlots, timeZone) : formattedSlots;
  }

  private setTimeZone(slots: TimeSlots, timeZone: string): TimeSlots {
    const formattedSlots = Object.entries(slots.slots).reduce(
      (acc, [date, daySlots]) => {
        acc[date] = daySlots.map((slot) => ({
          time: DateTime.fromISO(slot.time).setZone(timeZone).toISO() || "unknown-time",
          ...(slot.attendees ? { attendees: slot.attendees } : {}),
          ...(slot.bookingUid ? { bookingUid: slot.bookingUid } : {}),
        }));
        return acc;
      },
      {} as Record<string, { time: string }[]>
    );

    return { slots: formattedSlots };
  }

  private setTimeZoneRange(slots: RangeSlots, timeZone: string): RangeSlots {
    const formattedSlots = Object.entries(slots.slots).reduce(
      (acc, [date, daySlots]) => {
        acc[date] = daySlots.map((slot) => ({
          startTime: DateTime.fromISO(slot.startTime).setZone(timeZone).toISO() || "unknown-start-time",
          endTime: DateTime.fromISO(slot.endTime).setZone(timeZone).toISO() || "unknown-end-time",
          ...(slot.attendees ? { attendees: slot.attendees } : {}),
          ...(slot.bookingUid ? { bookingUid: slot.bookingUid } : {}),
        }));
        return acc;
      },
      {} as Record<string, { startTime: string; endTime: string }[]>
    );

    return { slots: formattedSlots };
  }

  private async formatSlots(
    availableSlots: TimeSlots,
    duration?: number,
    eventTypeId?: number,
    slotFormat?: SlotFormat
  ): Promise<RangeSlots> {
    if (slotFormat && !Object.values(SlotFormat).includes(slotFormat)) {
      throw new BadRequestException("Invalid slot format. Must be either 'range' or 'time'");
    }

    const slotDuration = await this.getDuration(duration, eventTypeId);

    const slots = Object.entries(availableSlots.slots).reduce<
      Record<string, { startTime: string; endTime: string; attendees?: number; bookingUid?: string }[]>
    >((acc, [date, slots]) => {
      acc[date] = (slots as { time: string; attendees?: number; bookingUid?: string }[]).map((slot) => {
        const startTime = new Date(slot.time);
        const endTime = new Date(startTime.getTime() + slotDuration * 60000);
        return {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          ...(slot.attendees ? { attendees: slot.attendees } : {}),
          ...(slot.bookingUid ? { bookingUid: slot.bookingUid } : {}),
        };
      });
      return acc;
    }, {});

    return { slots };
  }

  private async getDuration(duration?: number, eventTypeId?: number): Promise<number> {
    if (duration) {
      return duration;
    }

    if (eventTypeId) {
      const eventType = await this.eventTypesRepository.getEventTypeWithDuration(eventTypeId);
      if (!eventType) {
        throw new Error("Event type not found");
      }
      return eventType.length;
    }

    throw new Error("duration or eventTypeId is required");
  }
}
