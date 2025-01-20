import { EventTypesRepository_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/event-types.repository";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { SlotsRepository_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.repository";
import { UsersRepository } from "@/modules/users/users.repository";
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
    private readonly eventTypeRepository: EventTypesRepository_2024_06_14,
    private readonly slotsRepository: SlotsRepository_2024_09_04,
    private readonly usersRepository: UsersRepository
  ) {}

  async getAvailableSlots(query: GetSlotsInput_2024_09_04) {
    const eventType = await this.getEventType(query);
    if (!eventType) {
      throw new NotFoundException(`Event Type not found`);
    }
    const isTeamEvent = !!eventType?.teamId;

    const startTime = query.start;
    const endTime = this.adjustEndTime(query.end);
    const duration = eventType.length;
    const eventTypeId = eventType.id;
    const eventTypeSlug = eventType.slug;
    const usernameList = "usernames" in query ? query.usernames : [];
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
      slots[date] = availableSlots.slots[date].map((slot) => {
        const slotTimezoneAdjusted = timeZone
          ? DateTime.fromISO(slot.time).setZone(timeZone).toISO()
          : slot.time;
        if (!slotTimezoneAdjusted) {
          throw new BadRequestException(
            `Could not adjust timezone for slot ${slot.time} with timezone ${timeZone}`
          );
        }

        return slotTimezoneAdjusted;
      });
    }

    return slots;
  }

  adjustEndTime(endTime: string) {
    let dateTime = DateTime.fromISO(endTime);
    if (dateTime.hour === 0 && dateTime.minute === 0 && dateTime.second === 0) {
      dateTime = dateTime.set({ hour: 23, minute: 59, second: 59 });
    }

    return dateTime.toISO();
  }

  async reserveSlot(input: ReserveSlotInput_2024_09_04, existingUid?: string) {
    const eventType = await this.eventTypeRepository.getEventTypeWithHosts(input.eventTypeId);
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

    const booking = await this.slotsRepository.getBookingWithAttendeesByEventTypeIdAndStart(
      input.eventTypeId,
      startDate.toJSDate()
    );

    if (eventType.seatsPerTimeSlot) {
      const attendeesCount = booking?.attendees?.length;
      if (attendeesCount) {
        const seatsLeft = eventType.seatsPerTimeSlot - attendeesCount;
        if (seatsLeft < 1) {
          throw new UnprocessableEntityException(
            `Booking with id=${input.eventTypeId} at ${input.start} has no more seats left.`
          );
        }
      }
    }

    if (!eventType.seatsPerTimeSlot && booking) {
      throw new UnprocessableEntityException(`Can't reserve a slot if the event is already booked.`);
    }

    const uid = existingUid || uuid();
    if (eventType.userId) {
      await this.slotsRepository.upsertSlot(
        eventType.userId,
        eventType.id,
        startDate.toISO(),
        endDate.toISO(),
        uid,
        eventType.seatsPerTimeSlot !== null,
        input.reservationLength
      );
    } else {
      const host = eventType.hosts[0];
      await this.slotsRepository.upsertSlot(
        host.userId,
        eventType.id,
        startDate.toISO(),
        endDate.toISO(),
        uid,
        eventType.seatsPerTimeSlot !== null,
        input.reservationLength
      );
    }

    return uid;
  }

  async deleteSelectedSlot(uid: string) {
    return this.slotsRepository.deleteSelectedSlots(uid);
  }

  async getEventType(input: GetSlotsInput_2024_09_04) {
    if ("eventTypeId" in input) {
      return this.eventTypeRepository.getEventTypeById(input.eventTypeId);
    }
    if ("eventTypeSlug" in input) {
      const user = await this.usersRepository.findByUsername(input.username);
      if (!user) {
        throw new NotFoundException(`User with username ${input.username} not found`);
      }
      return this.eventTypeRepository.getUserEventTypeBySlug(user.id, input.eventTypeSlug);
    }

    return input.duration ? { ...dynamicEvent, length: input.duration } : dynamicEvent;
  }
}
