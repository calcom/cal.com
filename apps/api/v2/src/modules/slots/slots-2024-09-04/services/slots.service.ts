import { EventTypesRepository_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/event-types.repository";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { SlotsOutputService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots-output.service";
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
import { z } from "zod";

import { getAvailableSlots, dynamicEvent } from "@calcom/platform-libraries";
import { GetSlotsInput_2024_09_04, ReserveSlotInput_2024_09_04 } from "@calcom/platform-types";

const eventTypeMetadataSchema = z.object({
  multipleDuration: z.number().array().optional(),
});

@Injectable()
export class SlotsService_2024_09_04 {
  constructor(
    private readonly eventTypeRepository: EventTypesRepository_2024_06_14,
    private readonly slotsRepository: SlotsRepository_2024_09_04,
    private readonly usersRepository: UsersRepository,
    private readonly slotsOutputService: SlotsOutputService_2024_09_04
  ) {}

  async getAvailableSlots(query: GetSlotsInput_2024_09_04) {
    const eventType = await this.getEventType(query);
    if (!eventType) {
      throw new NotFoundException(`Event Type not found`);
    }
    const isTeamEvent = !!eventType?.teamId;

    const startTime = query.start;
    const endTime = this.adjustEndTime(query.end);
    const duration = query.duration;
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

    const formatted = await this.slotsOutputService.getOutputSlots(
      availableSlots,
      duration,
      eventTypeId,
      query.format,
      timeZone
    );

    return formatted;
  }

  adjustEndTime(endTime: string) {
    let dateTime = DateTime.fromISO(endTime, { zone: "utc" });
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

    const startDate = DateTime.fromISO(input.slotStart, { zone: "utc" });
    if (!startDate.isValid) {
      throw new BadRequestException("Invalid start date");
    }

    const metadata = eventTypeMetadataSchema.parse(eventType);
    if (
      input.slotDuration &&
      metadata.multipleDuration &&
      !metadata.multipleDuration.includes(input.slotDuration)
    ) {
      throw new BadRequestException(
        `Provided 'slotDuration' is not one of the possible lengths for the event type. The possible lengths for this variable length event type are: ${metadata.multipleDuration.join(
          ", "
        )}`
      );
    }

    const endDate = startDate.plus({ minutes: input.slotDuration ?? eventType.length });
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
            `Booking with id=${input.eventTypeId} at ${input.slotStart} has no more seats left.`
          );
        }
      }
    }

    const nonSeatedEventAlreadyBooked = !eventType.seatsPerTimeSlot && booking;
    if (nonSeatedEventAlreadyBooked) {
      throw new UnprocessableEntityException(`Can't reserve a slot if the event is already booked.`);
    }

    const uid = existingUid || uuid();
    if (eventType.userId) {
      const slot = await this.slotsRepository.upsertSlot(
        eventType.userId,
        eventType.id,
        startDate.toISO(),
        endDate.toISO(),
        uid,
        eventType.seatsPerTimeSlot !== null,
        input.reservationDuration
      );
      return {
        eventTypeId: eventType.id,
        slotStart:
          DateTime.fromJSDate(slot.slotUtcStartDate, { zone: "utc" }).toISO() || "unknown-slot-start",
        slotEnd: DateTime.fromJSDate(slot.slotUtcEndDate, { zone: "utc" }).toISO() || "unknown-slot-end",
        slotDuration: DateTime.fromJSDate(slot.slotUtcEndDate, { zone: "utc" }).diff(
          DateTime.fromJSDate(slot.slotUtcStartDate, { zone: "utc" }),
          "minutes"
        ).minutes,
        reservationDuration: input.reservationDuration,
        reservationUid: slot.uid,
        reservationUntil:
          DateTime.fromJSDate(slot.releaseAt, { zone: "utc" }).toISO() || "unknown-reserved-until",
      };
    }

    const host = eventType.hosts[0];
    const slot = await this.slotsRepository.upsertSlot(
      host.userId,
      eventType.id,
      startDate.toISO(),
      endDate.toISO(),
      uid,
      eventType.seatsPerTimeSlot !== null,
      input.reservationDuration
    );

    return {
      eventTypeId: eventType.id,
      slotStart: DateTime.fromJSDate(slot.slotUtcStartDate, { zone: "utc" }).toISO() || "unknown-slot-start",
      slotEnd: DateTime.fromJSDate(slot.slotUtcEndDate, { zone: "utc" }).toISO() || "unknown-slot-end",
      slotDuration: DateTime.fromJSDate(slot.slotUtcEndDate, { zone: "utc" }).diff(
        DateTime.fromJSDate(slot.slotUtcStartDate, { zone: "utc" }),
        "minutes"
      ).minutes,
      reservationDuration: input.reservationDuration,
      reservationUid: slot.uid,
      reservationUntil:
        DateTime.fromJSDate(slot.releaseAt, { zone: "utc" }).toISO() || "unknown-reserved-until",
    };
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
