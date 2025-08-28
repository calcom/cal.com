import type {
  CreateBookingData,
  CreateInstantBookingData,
  CreateBookingMeta,
  CreateRecurringBookingData,
  CreateInstantBookingResponse,
  BookingDataSchemaGetter,
} from "@calcom/features/bookings/lib/dto/types";
import type { BookingResponse } from "@calcom/features/bookings/types";
import handleInstantMeeting from "@calcom/features/instant-meeting/handleInstantMeeting";

import type { BookingCreateService } from "../handleNewBooking";
import { handleNewRecurringBooking } from "../handleNewRecurringBooking";

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
    const response = await handleInstantMeeting(bookingData);

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
