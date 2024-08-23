import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.repository";
import { CreateBookingInput } from "@/ee/bookings/2024-08-13/controllers/bookings.controller";
import { InputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/input.service";
import { OutputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/output.service";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";
import { Request } from "express";

import {
  handleNewBooking,
  handleNewRecurringBooking,
  getAllUserBookings,
  handleInstantMeeting,
} from "@calcom/platform-libraries-1.2.3";
import {
  CreateBookingInput_2024_08_13,
  RescheduleBookingInput_2024_08_13,
  CreateRecurringBookingInput_2024_08_13,
  GetBookingsInput_2024_08_13,
  CreateInstantBookingInput_2024_08_13,
} from "@calcom/platform-types";
import { PrismaClient } from "@calcom/prisma";
import { Booking } from "@calcom/prisma/client";

type BookingWithAttendeesAndEventType = Booking & {
  attendees: { name: string; email: string; timeZone: string; locale: string | null }[];
  eventType: { id: number };
};

@Injectable()
export class BookingsService_2024_08_13 {
  constructor(
    private readonly inputService: InputBookingsService_2024_08_13,
    private readonly outputService: OutputBookingsService_2024_08_13,
    private readonly bookingsRepository: BookingsRepository_2024_08_13,
    private readonly eventTypesRepository: EventTypesRepository_2024_06_14,
    private readonly prismaReadService: PrismaReadService
  ) {}

  async createBooking(request: Request, body: CreateBookingInput) {
    const bookingType = await this.getBookingType(body);

    switch (bookingType) {
      case "regular":
        return this.createRegularBookingOrReschedule(request, body);
      case "reschedule":
        return this.createRegularBookingOrReschedule(request, body);
      case "recurring":
        return this.createRecurringBooking(request, body as CreateRecurringBookingInput_2024_08_13);
      case "instant":
        return this.createInstantBooking(request, body as CreateInstantBookingInput_2024_08_13);
    }
  }

  async getBookingType(
    body: CreateBookingInput
  ): Promise<"regular" | "reschedule" | "recurring" | "instant"> {
    if ("rescheduleBookingUid" in body) {
      return "reschedule";
    }
    if ("instant" in body && body.instant) {
      return "instant";
    }
    if (await this.isRecurring(body)) {
      return "recurring";
    }
    return "regular";
  }

  async isRecurring(body: CreateBookingInput) {
    if ("rescheduleBookingUid" in body) {
      return false;
    }

    const eventType = await this.eventTypesRepository.getEventTypeById(body.eventTypeId);
    return !!eventType?.recurringEvent;
  }

  async createRegularBookingOrReschedule(
    request: Request,
    body: CreateBookingInput_2024_08_13 | RescheduleBookingInput_2024_08_13
  ) {
    const bookingRequest = await this.inputService.createNonRecurringBookingRequest(request, body);
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

  async createInstantBooking(request: Request, body: CreateInstantBookingInput_2024_08_13) {
    const bookingRequest = await this.inputService.createNonRecurringBookingRequest(request, body);
    const booking = await handleInstantMeeting(bookingRequest);

    const databaseBooking = await this.bookingsRepository.getByIdWithAttendees(booking.bookingId);
    if (!databaseBooking) {
      throw new Error(`Booking with id=${booking.bookingId} was not found in the database`);
    }

    return this.outputService.getOutputBooking(databaseBooking);
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

  async getBookings(queryParams: GetBookingsInput_2024_08_13, user: { email: string; id: number }) {
    const fetchedBookings: { bookings: BookingWithAttendeesAndEventType[] } = await getAllUserBookings({
      bookingListingByStatus: queryParams.status || [],
      skip: queryParams.cursor ?? 0,
      take: queryParams.limit ?? 10,
      // todo: add filters here like by eventtype id etc
      filters: this.inputService.transformGetBookingsFilters(queryParams),
      ctx: {
        user,
        prisma: this.prismaReadService.prisma as unknown as PrismaClient,
      },
      sort: this.inputService.transformGetBookingsSort(queryParams),
    });

    return fetchedBookings.bookings.map((booking) => {
      const formatted = {
        ...booking,
        eventTypeId: booking.eventType.id,
        startTime: new Date(booking.startTime),
        endTime: new Date(booking.endTime),
      };

      const isRecurring = !!formatted.recurringEventId;
      if (isRecurring) {
        return this.outputService.getOutputRecurringBooking(formatted);
      }
      return this.outputService.getOutputBooking(formatted);
    });
  }
}
