import type {
  CreateBookingInput_2024_08_13,
  CreateRecurringBookingInput_2024_08_13,
  CreateInstantBookingInput_2024_08_13,
} from "@calcom/platform-types";

export interface IBookingCreateService {
  createBooking(input: { bookingData: any; actor?: any; schemaGetter?: any }): Promise<any>;

  createRecurringBooking(input: {
    bookingData: CreateRecurringBookingInput_2024_08_13;
    actor?: any;
  }): Promise<any>;

  createInstantBooking(input: {
    bookingData: CreateInstantBookingInput_2024_08_13;
    actor?: any;
  }): Promise<any>;

  createSeatedBooking(input: { bookingData: CreateBookingInput_2024_08_13; actor?: any }): Promise<any>;

  create(input: { bookingData: any; actor?: any; schemaGetter?: any }): Promise<any>;
}