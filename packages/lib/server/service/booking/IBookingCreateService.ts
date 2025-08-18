import type getBookingDataSchema from "@calcom/features/bookings/lib/getBookingDataSchema";
import type getBookingDataSchemaForApi from "@calcom/features/bookings/lib/getBookingDataSchemaForApi";

import type {
  CreateBookingInput,
  CreateRecurringBookingInput,
  CreateInstantBookingInput,
} from "./BookingCreateTypes";

// Type for schema getter functions used in booking validation
type BookingDataSchemaGetter = typeof getBookingDataSchema | typeof getBookingDataSchemaForApi;

// Type for booking data that comes from external sources (API, web)
type ExternalBookingData = Record<string, unknown>;

export interface IBookingCreateService {
  createBooking(input: {
    bookingData: ExternalBookingData;
    schemaGetter?: BookingDataSchemaGetter;
  }): Promise<unknown>;

  createRecurringBooking(input: { bookingData: CreateRecurringBookingInput }): Promise<unknown>;

  createInstantBooking(input: { bookingData: CreateInstantBookingInput }): Promise<unknown>;

  createSeatedBooking(input: { bookingData: CreateBookingInput }): Promise<unknown>;

  create(input: {
    bookingData: ExternalBookingData;
    schemaGetter?: BookingDataSchemaGetter;
  }): Promise<unknown>;
}
