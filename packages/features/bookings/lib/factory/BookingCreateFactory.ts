import type { NextApiRequest } from "next";

import type {
  CreateBookingData,
  CreateInstantBookingData,
  CreateBookingMeta,
  CreateRecurringBookingData,
  CreateInstantBookingResponse,
} from "@calcom/features/bookings/lib/dto/types";
import type { BookingDataSchemaGetter } from "@calcom/features/bookings/lib/dto/types";
import type { BookingCreateService } from "@calcom/features/bookings/lib/handleNewBooking";
import { handleNewRecurringBooking } from "@calcom/features/bookings/lib/handleNewRecurringBooking";
import type { BookingResponse } from "@calcom/features/bookings/types";

interface IBookingCreateFactoryDependencies {
  bookingCreateService: BookingCreateService;
}

export class BookingCreateFactory {
  constructor(private readonly deps: IBookingCreateFactoryDependencies) {}

  async createBooking({
    bookingData,
    bookingMeta,
    schemaGetter,
  }: {
    bookingData: CreateBookingData;
    bookingMeta?: CreateBookingMeta;
    schemaGetter?: BookingDataSchemaGetter;
  }) {
    return this.deps.bookingCreateService.create({ bookingData, bookingMeta, schemaGetter });
  }

  async createRecurringBooking({
    bookingData,
    bookingMeta,
  }: {
    bookingData: CreateRecurringBookingData;
    bookingMeta?: CreateBookingMeta;
  }): Promise<BookingResponse[]> {
    const handlerInput = { bookingData, ...(bookingMeta ?? {}) };
    return handleNewRecurringBooking(handlerInput);
  }

  async createInstantBooking({
    bookingData,
  }: {
    bookingData: CreateInstantBookingData;
  }): Promise<CreateInstantBookingResponse> {
    // Dynamic import because handleInstantMeeting has some weird dependency on vapid that is required to be met on module load. We don't need all that unless someone wants to create an instant meeting.
    // Later we would dynamically import the vapid related module within the handleInstantMeeting itself
    const handleInstantMeeting = (await import("@calcom/features/instant-meeting/handleInstantMeeting"))
      .default;

    // TODO: Later we would change the type of handleInstantMeeting to accept the bookingData directly
    const req = { body: bookingData } as NextApiRequest;

    const response = await handleInstantMeeting(req);

    return response;
  }

  async createSeatedBooking({
    bookingData,
    bookingMeta,
  }: {
    bookingData: CreateBookingData;
    bookingMeta?: CreateBookingMeta;
  }) {
    // Seated bookings use the same handler as regular bookings
    return this.deps.bookingCreateService.create({ bookingData, bookingMeta });
  }
}
