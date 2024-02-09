import { EventTypesRepository } from "@/ee/event-types/event-types.repository";
import { ReserveSlotInput } from "@/modules/slots/inputs/reserve-slot.input";
import { SlotsRepository } from "@/modules/slots/slots.repository";
import { Injectable, NotFoundException } from "@nestjs/common";
import { v4 as uuid } from "uuid";

@Injectable()
export class SlotsService {
  constructor(
    private readonly eventTypeRepo: EventTypesRepository,
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
}
