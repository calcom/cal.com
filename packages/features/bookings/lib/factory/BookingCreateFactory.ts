import type {
  CreateBookingData,
  CreateInstantBookingData,
  CreateBookingMeta,
  CreateRecurringBookingData,
  CreateInstantBookingResponse,
  BookingDataSchemaGetter,
} from "@calcom/features/bookings/lib/dto/types";
import type { BookingCreateService } from "@calcom/features/bookings/lib/service/BookingCreateService";
import type { InstantBookingCreateService } from "@calcom/features/bookings/lib/service/InstantBookingCreateService";
import type { RecurringBookingCreateService } from "@calcom/features/bookings/lib/service/RecurringBookingCreateService";
import type { BookingResponse } from "@calcom/features/bookings/types";

interface IBookingCreateFactoryDependencies {
  bookingCreateService: BookingCreateService;
  recurringBookingCreateService: RecurringBookingCreateService;
  instantBookingCreateService: InstantBookingCreateService;
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
    return this.deps.recurringBookingCreateService.create(handlerInput);
  }

  async createInstantBooking({
    bookingData,
  }: {
    bookingData: CreateInstantBookingData;
  }): Promise<CreateInstantBookingResponse> {
    return this.deps.instantBookingCreateService.create(bookingData);
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
