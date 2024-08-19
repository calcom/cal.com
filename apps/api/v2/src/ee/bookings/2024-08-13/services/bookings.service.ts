import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.repository";
import { InputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/input.service";
import { OutputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/output.service";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { Injectable } from "@nestjs/common";
import { Request } from "express";

import { handleNewBooking, handleNewRecurringBooking } from "@calcom/platform-libraries";
import {
  CreateBookingInput_2024_08_13,
  RescheduleBookingInput_2024_08_13,
  CreateRecurringBookingInput_2024_08_13,
  GetBookingsInput_2024_08_13,
} from "@calcom/platform-types";
import { Prisma } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";

@Injectable()
export class BookingsService_2024_08_13 {
  constructor(
    private readonly inputService: InputBookingsService_2024_08_13,
    private readonly outputService: OutputBookingsService_2024_08_13,
    private readonly bookingsRepository: BookingsRepository_2024_08_13,
    private readonly eventTypesRepository: EventTypesRepository_2024_06_14
  ) {}

  async createBooking(
    request: Request,
    body:
      | CreateBookingInput_2024_08_13
      | RescheduleBookingInput_2024_08_13
      | CreateRecurringBookingInput_2024_08_13
  ) {
    const isRecurring = await this.isRecurring(body);

    if (!("rescheduleBookingUid" in body) && isRecurring) {
      return this.createRecurringBooking(request, body);
    }

    const bookingRequest = await this.inputService.createBookingRequest(request, body);
    const booking = await handleNewBooking(bookingRequest);
    if (!booking.id) {
      throw new Error("Booking was not created");
    }

    const databaseBooking = await this.bookingsRepository.getByIdWithAttendees(booking.id);
    if (!databaseBooking) {
      throw new Error(`Booking with id=${booking.id} was not found in the database`);
    }

    return this.outputService.getOutputBooking(databaseBooking);
  }

  async isRecurring(
    body:
      | CreateBookingInput_2024_08_13
      | RescheduleBookingInput_2024_08_13
      | CreateRecurringBookingInput_2024_08_13
  ) {
    if ("rescheduleBookingUid" in body) {
      return false;
    }

    const eventType = await this.eventTypesRepository.getEventTypeById(body.eventTypeId);

    return !!eventType?.recurringEvent;
  }

  async createRecurringBooking(request: Request, body: CreateRecurringBookingInput_2024_08_13) {
    const bookingRequest = await this.inputService.createRecurringBookingRequest(request, body);
    const bookings = await handleNewRecurringBooking(bookingRequest);
    const uid = bookings[0].recurringEventId;
    if (!uid) {
      throw new Error("Recurring booking was not created");
    }

    const recurringBooking = await this.bookingsRepository.getRecurringByUidWithAttendees(uid);
    return this.outputService.getOutputRecurringBookings(recurringBooking);
  }

  async getBooking(uid: string) {
    const booking = await this.bookingsRepository.getByUidWithAttendees(uid);

    if (booking) {
      const isRecurring = !!booking.recurringEventId;
      if (isRecurring) {
        return this.outputService.getOutputRecurringBooking(booking);
      }
      return this.outputService.getOutputBooking(booking);
    }

    const recurringBooking = await this.bookingsRepository.getRecurringByUidWithAttendees(uid);
    if (!recurringBooking.length) {
      throw new Error(`Booking with uid=${uid} was not found in the database`);
    }

    return this.outputService.getOutputRecurringBookings(recurringBooking);
  }

  async getBookings(queryParams: GetBookingsInput_2024_08_13) {
    return [];
  }

  async createGetBookingsWhere(queryParams: GetBookingsInput_2024_08_13): Promise<Prisma.BookingWhereInput> {
    const where: Prisma.BookingWhereInput = {};

    if (queryParams.status) {
      if (queryParams.status === "upcoming") {
        where.startTime = {
          gte: new Date(),
        };
      } else if (queryParams.status === "past") {
        where.startTime = {
          lte: new Date(),
        };
      } else if (queryParams.status.startsWith("!")) {
        where.status = {
          not: queryParams.status.substring(1) as BookingStatus,
        };
      } else {
        where.status = queryParams.status;
      }
    }

    if (queryParams.attendeeEmail) {
      where.attendees = {
        some: {
          email: {
            contains: queryParams.attendeeEmail,
            mode: "insensitive",
          },
        },
      };
    }

    if (queryParams.eventTypeIds) {
      where.eventTypeId = {
        in: queryParams.eventTypeIds,
      };
    }

    if (queryParams.eventTypeId) {
      where.eventTypeId = queryParams.eventTypeId;
    }

    if (queryParams.teamsIds) {
      where.destinationCalendar = {
        teamId: {
          in: queryParams.teamsIds,
        },
      };
    }

    if (queryParams.teamId) {
      where.destinationCalendar = {
        teamId: queryParams.teamId,
      };
    }

    if (queryParams.dateRange) {
      const [fromDate, toDate] = queryParams.dateRange;
      where.startTime = {
        gte: new Date(fromDate),
        lte: new Date(toDate),
      };
    } else {
      if (queryParams.fromDate) {
        where.startTime = {
          gte: new Date(queryParams.fromDate),
        };
      }

      if (queryParams.toDate) {
        where.startTime = {
          ...where.startTime,
          lte: new Date(queryParams.toDate),
        };
      }
    }

    return where;
  }
}
