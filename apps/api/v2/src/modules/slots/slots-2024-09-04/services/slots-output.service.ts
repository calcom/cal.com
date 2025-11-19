import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { Injectable, BadRequestException } from "@nestjs/common";
import { DateTime } from "luxon";

import { SlotFormat } from "@calcom/platform-enums";
import type {
  GetReservedSlotOutput_2024_09_04,
  RangeSlot_2024_09_04,
  RangeSlotsOutput_2024_09_04,
  ReserveSlotOutput_2024_09_04,
  SeatedRangeSlot_2024_09_04,
  SeatedSlot_2024_09_04,
  Slot_2024_09_04,
  SlotsOutput_2024_09_04,
} from "@calcom/platform-types";
import type { SelectedSlots } from "@calcom/prisma/client";

type GetAvailableSlots = {
  slots: Record<string, { time: string; attendees?: number; bookingUid?: string; away?: boolean }[]>;
};

@Injectable()
export class SlotsOutputService_2024_09_04 {
  constructor(private readonly eventTypesRepository: EventTypesRepository_2024_06_14) {}

  async getAvailableSlots(
    availableSlots: GetAvailableSlots,
    eventTypeId: number,
    duration?: number,
    format?: SlotFormat,
    timeZone?: string
  ): Promise<SlotsOutput_2024_09_04 | RangeSlotsOutput_2024_09_04> {
    if (!format || format === SlotFormat.Time) {
      return this.getAvailableTimeSlots(availableSlots, eventTypeId, timeZone);
    }

    return this.getAvailableRangeSlots(availableSlots, eventTypeId, timeZone, duration);
  }

  private async getAvailableTimeSlots(
    availableSlots: GetAvailableSlots,
    eventTypeId: number,
    timeZone: string | undefined
  ): Promise<SlotsOutput_2024_09_04> {
    const eventType = await this.eventTypesRepository.getEventTypeById(eventTypeId);

    const slots: { [key: string]: (Slot_2024_09_04 | SeatedSlot_2024_09_04)[] } = {};
    for (const date in availableSlots.slots) {
      const availableTimeSlots = availableSlots.slots[date].filter((slot) => !slot.away);
      if (availableTimeSlots.length > 0) {
        slots[date] = availableTimeSlots.map((slot) => {
          if (!timeZone) {
            if (!eventType?.seatsPerTimeSlot) {
              return this.getAvailableTimeSlot(slot.time);
            }
            return this.getAvailableTimeSlotSeated(
              slot.time,
              slot.attendees || 0,
              eventType.seatsPerTimeSlot || 0,
              slot.bookingUid
            );
          }
          const slotTimezoneAdjusted = DateTime.fromISO(slot.time, { zone: "utc" }).setZone(timeZone).toISO();
          if (!slotTimezoneAdjusted) {
            throw new BadRequestException(
              `Could not adjust timezone for slot ${slot.time} with timezone ${timeZone}`
            );
          }
          if (!eventType?.seatsPerTimeSlot) {
            return this.getAvailableTimeSlot(slotTimezoneAdjusted);
          }
          return this.getAvailableTimeSlotSeated(
            slotTimezoneAdjusted,
            slot.attendees || 0,
            eventType.seatsPerTimeSlot || 0,
            slot.bookingUid
          );
        });
      }
    }

    return slots;
  }

  private getAvailableTimeSlot(start: string): Slot_2024_09_04 | SeatedSlot_2024_09_04 {
    return {
      start,
    };
  }

  private getAvailableTimeSlotSeated(
    start: string,
    seatsBooked: number,
    eventTypeSeatsPerTimeslot: number,
    bookingUid: string | undefined
  ): Slot_2024_09_04 | SeatedSlot_2024_09_04 {
    return {
      start,
      seatsBooked,
      seatsRemaining: eventTypeSeatsPerTimeslot - seatsBooked,
      seatsTotal: eventTypeSeatsPerTimeslot,
      bookingUid,
    };
  }

  private async getAvailableRangeSlots(
    availableSlots: GetAvailableSlots,
    eventTypeId: number,
    timeZone?: string,
    duration?: number
  ): Promise<RangeSlotsOutput_2024_09_04> {
    const eventType = await this.eventTypesRepository.getEventTypeById(eventTypeId);

    const slotDuration = duration ?? eventType?.length;

    const slots = Object.entries(availableSlots.slots).reduce<
      Record<string, (RangeSlot_2024_09_04 | SeatedRangeSlot_2024_09_04)[]>
    >((acc, [date, slots]) => {
      const availableTimeSlots = slots.filter((slot) => !slot.away);
      if (availableTimeSlots.length > 0) {
        acc[date] = availableTimeSlots.map((slot) => {
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

            if (!eventType?.seatsPerTimeSlot) {
              return this.getAvailableRangeSlot(start, end);
            }
            return this.getAvailableRangeSlotSeated(
              start,
              end,
              slot.attendees || 0,
              eventType.seatsPerTimeSlot ?? undefined,
              slot.bookingUid
            );
          } else {
            const start = DateTime.fromISO(slot.time, { zone: "utc" }).toISO();
            const end = DateTime.fromISO(slot.time, { zone: "utc" }).plus({ minutes: slotDuration }).toISO();

            if (!start || !end) {
              throw new BadRequestException(`Could not create UTC time for slot ${slot.time}`);
            }

            if (!eventType?.seatsPerTimeSlot) {
              return this.getAvailableRangeSlot(start, end);
            }
            return this.getAvailableRangeSlotSeated(
              start,
              end,
              slot.attendees || 0,
              eventType.seatsPerTimeSlot ?? undefined,
              slot.bookingUid
            );
          }
        });
      }
      return acc;
    }, {});

    return slots;
  }

  private getAvailableRangeSlot(
    start: string,
    end: string
  ): RangeSlot_2024_09_04 | SeatedRangeSlot_2024_09_04 {
    return {
      start,
      end,
    };
  }

  private getAvailableRangeSlotSeated(
    start: string,
    end: string,
    seatsBooked: number,
    eventTypeSeatsPerTimeslot: number,
    bookingUid: string | undefined
  ): RangeSlot_2024_09_04 | SeatedRangeSlot_2024_09_04 {
    return {
      start,
      end,
      seatsBooked,
      seatsRemaining: eventTypeSeatsPerTimeslot - seatsBooked,
      seatsTotal: eventTypeSeatsPerTimeslot,
      bookingUid,
    };
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
