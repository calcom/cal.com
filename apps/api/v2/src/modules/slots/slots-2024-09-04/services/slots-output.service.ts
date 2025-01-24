import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { Injectable, BadRequestException } from "@nestjs/common";
import { DateTime } from "luxon";

import { SlotFormat } from "@calcom/platform-enums";
import {
  GetReservedSlotOutput_2024_09_04,
  RangeSlot_2024_09_04,
  RangeSlotsOutput_2024_09_04,
  ReserveSlotOutput_2024_09_04,
  SeatedRangeSlot_2024_09_04,
  SeatedSlot_2024_09_04,
  Slot_2024_09_04,
  SlotsOutput_2024_09_04,
} from "@calcom/platform-types";
import { SelectedSlots } from "@calcom/prisma/client";

type GetAvailableSlots = {
  slots: Record<string, { time: string; attendees?: number; bookingUid?: string }[]>;
};

@Injectable()
export class SlotsOutputService_2024_09_04 {
  constructor(private readonly eventTypesRepository: EventTypesRepository_2024_06_14) {}

  async getAvailableSlots(
    availableSlots: GetAvailableSlots,
    duration?: number,
    eventTypeId?: number,
    format?: SlotFormat,
    timeZone?: string
  ): Promise<SlotsOutput_2024_09_04 | RangeSlotsOutput_2024_09_04> {
    if (!format || format === SlotFormat.Time) {
      return this.getAvailableTimeSlots(availableSlots, timeZone);
    }

    return this.getAvailableRangeSlots(availableSlots, duration, eventTypeId, timeZone);
  }

  private getAvailableTimeSlots(
    availableSlots: GetAvailableSlots,
    timeZone: string | undefined
  ): SlotsOutput_2024_09_04 {
    const slots: { [key: string]: (Slot_2024_09_04 | SeatedSlot_2024_09_04)[] } = {};
    for (const date in availableSlots.slots) {
      slots[date] = availableSlots.slots[date].map((slot) => {
        if (!timeZone) {
          return this.getAvailableTimeSlot(slot.time, slot.attendees, slot.bookingUid);
        }
        const slotTimezoneAdjusted = DateTime.fromISO(slot.time, { zone: "utc" }).setZone(timeZone).toISO();
        if (!slotTimezoneAdjusted) {
          throw new BadRequestException(
            `Could not adjust timezone for slot ${slot.time} with timezone ${timeZone}`
          );
        }
        return this.getAvailableTimeSlot(slotTimezoneAdjusted, slot.attendees, slot.bookingUid);
      });
    }

    return slots;
  }

  private getAvailableTimeSlot(
    start: string,
    attendees?: number,
    bookingUid?: string
  ): Slot_2024_09_04 | SeatedSlot_2024_09_04 {
    return {
      start,
      ...(attendees ? { attendeesCount: attendees } : {}),
      ...(bookingUid ? { bookingUid } : {}),
    };
  }

  private async getAvailableRangeSlots(
    availableSlots: GetAvailableSlots,
    duration?: number,
    eventTypeId?: number,
    timeZone?: string
  ): Promise<RangeSlotsOutput_2024_09_04> {
    const slotDuration = await this.getEventTypeDuration(duration, eventTypeId);

    const slots = Object.entries(availableSlots.slots).reduce<
      Record<string, (RangeSlot_2024_09_04 | SeatedRangeSlot_2024_09_04)[]>
    >((acc, [date, slots]) => {
      acc[date] = slots.map((slot) => {
        if (timeZone) {
          const start = DateTime.fromISO(slot.time, { zone: "utc" }).setZone(timeZone).toISO();
          if (!start) {
            throw new BadRequestException(
              `Could not adjust timezone for slot ${slot.time} with timezone ${timeZone}`
            );
          }

          const end = DateTime.fromISO(slot.time, { zone: "utc" })
            .plus({ minutes: slotDuration })
            .setZone(timeZone)
            .toISO();

          if (!end) {
            throw new BadRequestException(
              `Could not adjust timezone for slot end time ${slot.time} with timezone ${timeZone}`
            );
          }

          return this.getAvailableRangeSlot(start, end, slot.attendees, slot.bookingUid);
        } else {
          const start = DateTime.fromISO(slot.time, { zone: "utc" }).toISO();
          const end = DateTime.fromISO(slot.time, { zone: "utc" }).plus({ minutes: slotDuration }).toISO();

          if (!start || !end) {
            throw new BadRequestException(`Could not create UTC time for slot ${slot.time}`);
          }

          return this.getAvailableRangeSlot(start, end, slot.attendees, slot.bookingUid);
        }
      });
      return acc;
    }, {});

    return slots;
  }

  private getAvailableRangeSlot(
    start: string,
    end: string,
    attendees?: number,
    bookingUid?: string
  ): RangeSlot_2024_09_04 | SeatedRangeSlot_2024_09_04 {
    return {
      start,
      end,
      ...(attendees ? { attendeesCount: attendees } : {}),
      ...(bookingUid ? { bookingUid } : {}),
    };
  }

  private async getEventTypeDuration(duration?: number, eventTypeId?: number): Promise<number> {
    if (duration) {
      return duration;
    }

    if (eventTypeId) {
      const eventType = await this.eventTypesRepository.getEventTypeById(eventTypeId);
      if (!eventType) {
        throw new Error("Event type not found");
      }
      return eventType.length;
    }

    throw new Error("duration or eventTypeId is required");
  }

  getReservationSlot(slot: SelectedSlots): GetReservedSlotOutput_2024_09_04 {
    return {
      eventTypeId: slot.eventTypeId,
      slotStart: DateTime.fromJSDate(slot.slotUtcStartDate, { zone: "utc" }).toISO() || "unknown-slot-start",
      slotEnd: DateTime.fromJSDate(slot.slotUtcEndDate, { zone: "utc" }).toISO() || "unknown-slot-end",
      slotDuration: DateTime.fromJSDate(slot.slotUtcEndDate, { zone: "utc" }).diff(
        DateTime.fromJSDate(slot.slotUtcStartDate, { zone: "utc" }),
        "minutes"
      ).minutes,
      reservationUid: slot.uid,
      reservationUntil:
        DateTime.fromJSDate(slot.releaseAt, { zone: "utc" }).toISO() || "unknown-reserved-until",
    };
  }

  getReservationSlotCreated(slot: SelectedSlots, reservationDuration: number): ReserveSlotOutput_2024_09_04 {
    return {
      eventTypeId: slot.eventTypeId,
      slotStart: DateTime.fromJSDate(slot.slotUtcStartDate, { zone: "utc" }).toISO() || "unknown-slot-start",
      slotEnd: DateTime.fromJSDate(slot.slotUtcEndDate, { zone: "utc" }).toISO() || "unknown-slot-end",
      slotDuration: DateTime.fromJSDate(slot.slotUtcEndDate, { zone: "utc" }).diff(
        DateTime.fromJSDate(slot.slotUtcStartDate, { zone: "utc" }),
        "minutes"
      ).minutes,
      reservationDuration,
      reservationUid: slot.uid,
      reservationUntil:
        DateTime.fromJSDate(slot.releaseAt, { zone: "utc" }).toISO() || "unknown-reserved-until",
    };
  }
}
