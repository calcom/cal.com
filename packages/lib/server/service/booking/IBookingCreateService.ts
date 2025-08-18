import type {
  CreateBookingInput,
  CreateRecurringBookingInput,
  CreateInstantBookingInput,
} from "./BookingCreateTypes";

export interface IBookingCreateService {
  createBooking(input: { bookingData: any; schemaGetter?: any }): Promise<any>;

  createRecurringBooking(input: { bookingData: CreateRecurringBookingInput }): Promise<any>;

  createInstantBooking(input: { bookingData: CreateInstantBookingInput }): Promise<any>;

  createSeatedBooking(input: { bookingData: CreateBookingInput }): Promise<any>;

  create(input: { bookingData: any; schemaGetter?: any }): Promise<any>;
}
