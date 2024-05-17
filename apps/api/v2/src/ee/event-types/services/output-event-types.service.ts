import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";
import type { Availability, EventType } from "@prisma/client";

import { getResponseEventTypeLocations, getResponseEventTypeBookingFields } from "@calcom/platform-libraries";
import { WeekDay } from "@calcom/platform-types";
import { eventTypeLocations } from "@calcom/prisma/zod-utils";

@Injectable()
export class OutputEventTypesService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getResponseEventType(databaseEventType: EventType) {
    const locations = this.transformLocations(databaseEventType.locations);
    const bookingFields = this.transformBookingFields(databaseEventType.bookingFields);
    return {};
  }

  transformLocations(locations: EventType["locations"]) {
    return getResponseEventTypeLocations(eventTypeLocations.parse(locations));
  }

  transformBookingFields(inputBookingFields: EventType["bookingFields"]) {
    return getResponseEventTypeBookingFields(fieldsSchema.parse(inputBookingFields));
  }
}
