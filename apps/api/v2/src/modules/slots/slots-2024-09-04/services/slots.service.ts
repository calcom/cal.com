import { EventTypesRepository_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/event-types.repository";
import { SlotsRepository_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.repository";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { DateTime } from "luxon";
import { v4 as uuid } from "uuid";

import { getAvailableSlots, dynamicEvent } from "@calcom/platform-libraries";
import { GetSlotsInput_2024_09_04, ReserveSlotInput_2024_09_04 } from "@calcom/platform-types";

@Injectable()
export class SlotsService_2024_09_04 {
  constructor(
    private readonly eventTypeRepo: EventTypesRepository_2024_04_15,
    private readonly slotsRepo: SlotsRepository_2024_09_04
  ) {}

  async getAvailableSlots(query: GetSlotsInput_2024_09_04) {
    const eventType = await this.getEventType(query);
    const isTeamEvent = !!eventType?.teamId;

    const startTime = query.start;
    const endTime = query.end;
    const duration = eventType.length;
    const eventTypeId = eventType.id;
    const eventTypeSlug = eventType.slug;
    const usernameList = "users" in query ? query.users : [];
    const timeZone = query.timeZone;

    const availableSlots: { slots: { [key: string]: { time: string }[] } } = await getAvailableSlots({
      input: {
        startTime,
        endTime,
        duration,
        eventTypeId,
        eventTypeSlug,
        usernameList,
        timeZone,
        isTeamEvent,
      },
      ctx: {},
    });

    const slots: { [key: string]: string[] } = {};
    for (const date in availableSlots.slots) {
      slots[date] = availableSlots.slots[date].map((slot) => slot.time);
    }

    return slots;
  }
  async reserveSlot(input: ReserveSlotInput_2024_09_04) {
    const eventType = await this.eventTypeRepo.getEventTypeWithSeats(input.eventTypeId);
    if (!eventType) {
      throw new NotFoundException(`Event Type with ID=${input.eventTypeId} not found`);
    }

    const startDate = DateTime.fromISO(input.start, { zone: "utc" });
    if (!startDate.isValid) {
      throw new BadRequestException("Invalid start date");
    }

    const endDate = startDate.plus({ minutes: eventType.length });
    if (!endDate.isValid) {
      throw new BadRequestException("Invalid end date");
    }

    if (eventType.seatsPerTimeSlot) {
      const bookingWithAttendees = await this.slotsRepo.getBookingWithAttendeesByEventTypeIdAndStart(
        input.eventTypeId,
        startDate.toJSDate()
      );
      const attendeesCount = bookingWithAttendees?.attendees?.length;
      if (!attendeesCount) {
        throw new UnprocessableEntityException(`Can't reserve a slot because no booking has yet been made.`);
      }

      const seatsLeft = eventType.seatsPerTimeSlot - attendeesCount;
      if (seatsLeft < 1) {
        throw new UnprocessableEntityException(
          `Booking with id=${input.eventTypeId} at ${input.start} has no more seats left.`
        );
      }
    }

    const uid = uuid();
    await Promise.all(
      eventType.users.map((user) =>
        this.slotsRepo.upsertSelectedSlot(
          user.id,
          eventType.id,
          startDate.toISO(),
          endDate.toISO(),
          uid,
          eventType.seatsPerTimeSlot !== null
        )
      )
    );

    return uid;
  }

  async deleteSelectedSlot(uid?: string) {
    if (!uid) return;

    return this.slotsRepo.deleteSelectedSlots(uid);
  }

  async getEventType(input: GetSlotsInput_2024_09_04) {
    if ("eventTypeId" in input) {
      return this.eventTypeRepo.getEventTypeById(input.eventTypeId);
    }
    if ("eventTypeSlug" in input) {
      return this.eventTypeRepo.getEventTypeBySlug(input.eventTypeSlug);
    }

    return dynamicEvent;
  }
}
