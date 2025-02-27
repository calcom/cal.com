import { GetSlotsInput_2024_09_04 } from "@/modules/slots/inputs/get-slots-input.pipe";
import { Injectable, NotFoundException } from "@nestjs/common";
import { DateTime } from "luxon";
import { v4 as uuid } from "uuid";

import { dynamicEvent } from "@calcom/platform-libraries";
import { ReserveSlotInput } from "@calcom/platform-types";

import { supabase } from "../../../config/supabase";
import { EventTypesRepository_2024_04_15 } from "../../../ee/event-types/event-types_2024_04_15/event-types.repository";
import { SlotsRepository } from "../../slots/slots.repository";

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

  async getAvailableSlots(query: GetSlotsInput_2024_09_04) {
    const queryTransformed = await this.transformGetSlotsQuery(query);

    return [queryTransformed];
  }

  private async transformGetSlotsQuery(query: GetSlotsInput_2024_09_04) {
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
    const orgSlug = "organizationSlug" in query ? query.organizationSlug : null;

    return {
      isTeamEvent,
      startTime,
      endTime,
      duration,
      eventTypeId,
      eventTypeSlug,
      usernameList,
      timeZone,
      orgSlug,
    };
  }

  private async getEventType(input: GetSlotsInput_2024_09_04) {
    if ("eventTypeId" in input) {
      const { data: eventTypeById } = await supabase
        .from("EventType")
        .select("*")
        .eq("id", input.eventTypeId)
        .limit(1)
        .single();

      return eventTypeById;
    }

    if ("eventTypeSlug" in input) {
      const { data: user, error } = await supabase
        .from("users")
        .select("id")
        .eq("username", input.username)
        .limit(1)
        .single();

      if (!user || error) {
        throw new NotFoundException(`User with username ${input.username} not found`);
      }

      const { data: eventTypeBySlug } = await supabase
        .from("EventType")
        .select("*")
        .eq("slug", input.eventTypeSlug)
        .eq("userId", user.id)
        .limit(1)
        .single();

      return eventTypeBySlug;
    }

    return input.duration ? { ...dynamicEvent, length: input.duration } : dynamicEvent;
  }

  private adjustEndTime(endTime: string) {
    let dateTime = DateTime.fromISO(endTime, { zone: "utc" });
    if (dateTime.hour === 0 && dateTime.minute === 0 && dateTime.second === 0) {
      dateTime = dateTime.set({ hour: 23, minute: 59, second: 59 });
    }

    return dateTime.toISO();
  }
}
