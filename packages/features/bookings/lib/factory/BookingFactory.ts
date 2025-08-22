import { handleNewRecurringBooking } from "@calcom/features/bookings/lib/handleNewRecurringBooking";
import type { BookingCreateService } from "@calcom/features/bookings/lib/service/BookingCreateService/BookingCreateService";
import type {
  CreateBookingData,
  CreateInstantBookingData,
  CreateBookingMeta,
  CreateRecurringBookingData,
  CreateInstantBookingResponse,
} from "@calcom/features/bookings/lib/service/BookingCreateService/types";
import type { BookingResponse } from "@calcom/features/bookings/types";

interface IBookingFactoryDependencies {
  bookingCreateService: BookingCreateService;
}

export class BookingFactory {
  constructor(private readonly dependencies: IBookingFactoryDependencies) {}

  async createBooking({
    bookingData,
    bookingMeta,
    schemaGetter,
  }: {
    bookingData: CreateBookingData;
    bookingMeta?: CreateBookingMeta;
    schemaGetter?: BookingDataSchemaGetter;
  }) {
    const handlerInput = { bookingData, ...(bookingMeta ?? {}) };
    return this.dependencies.bookingCreateService.handle(handlerInput, schemaGetter);
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
    const handleInstantMeeting = (await import("@calcom/features/instant-meeting/handleInstantMeeting"))
      .default;

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
    const handlerInput = { bookingData, ...(bookingMeta ?? {}) };
    return this.dependencies.bookingCreateService.handle(handlerInput);
  }
}
