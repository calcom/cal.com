import { EventTypesRepository_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/event-types.repository";
import { SlotsRepository } from "@/modules/slots/slots.repository";
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { v4 as uuid } from "uuid";

import { SlotFormat } from "@calcom/platform-enums";
import { ReserveSlotInput } from "@calcom/platform-types";

@Injectable()
export class SlotsService {
  constructor(
    private readonly eventTypeRepo: EventTypesRepository_2024_04_15,
    private readonly slotsRepo: SlotsRepository
  ) {}

  async reserveSlot(input: ReserveSlotInput, headerUid?: string) {
    const uid = headerUid || uuid();
    const eventType = await this.eventTypeRepo.getEventTypeWithSeats(input.eventTypeId);
    if (!eventType) {
      throw new NotFoundException("Event Type not found");
    }

    let shouldReserveSlot = true;
    if (eventType.seatsPerTimeSlot) {
      const bookingWithAttendees = await this.slotsRepo.getBookingWithAttendees(input.bookingUid);
      const bookingAttendeesLength = bookingWithAttendees?.attendees?.length;
      if (bookingAttendeesLength) {
        const seatsLeft = eventType.seatsPerTimeSlot - bookingAttendeesLength;
        if (seatsLeft < 1) shouldReserveSlot = false;
      } else {
        shouldReserveSlot = false;
      }
    }

    if (eventType && shouldReserveSlot) {
      await Promise.all(
        eventType.users.map((user) =>
          this.slotsRepo.upsertSelectedSlot(user.id, input, uid, eventType.seatsPerTimeSlot !== null)
        )
      );
    }

    return uid;
  }

  async deleteSelectedslot(uid?: string) {
    if (!uid) return;

    return this.slotsRepo.deleteSelectedSlots(uid);
  }

  async checkIfIsTeamEvent(eventTypeId?: number) {
    if (!eventTypeId) return false;

    const event = await this.eventTypeRepo.getEventTypeById(eventTypeId);
    return !!event?.teamId;
  }

  async getEventTypeWithDuration(eventTypeId: number) {
    return await this.eventTypeRepo.getEventTypeWithDuration(eventTypeId);
  }

  async getDuration(duration?: number, eventTypeId?: number): Promise<number> {
    if (duration) {
      return duration;
    }

    if (eventTypeId) {
      const eventType = await this.eventTypeRepo.getEventTypeWithDuration(eventTypeId);
      if (!eventType) {
        throw new Error("Event type not found");
      }
      return eventType.length;
    }

    throw new Error("duration or eventTypeId is required");
  }

  async formatSlots(
    availableSlots: { slots: Record<string, { time: string }[]> },
    duration?: number,
    eventTypeId?: number,
    slotFormat?: SlotFormat
  ): Promise<Record<string, { startTime: string; endTime: string }[]>> {
    if (slotFormat && !Object.values(SlotFormat).includes(slotFormat)) {
      throw new BadRequestException("Invalid slot format. Must be either 'range' or 'time'");
    }

    const slotDuration = await this.getDuration(duration, eventTypeId);

    return Object.entries(availableSlots.slots).reduce<
      Record<string, { startTime: string; endTime: string }[]>
    >((acc, [date, slots]) => {
      acc[date] = (slots as { time: string }[]).map((slot) => {
        const startTime = new Date(slot.time);
        const endTime = new Date(startTime.getTime() + slotDuration * 60000);
        return {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        };
      });
      return acc;
    }, {});
  }
}
